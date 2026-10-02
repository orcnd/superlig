import { describe, expect, it } from "vitest";
import type { LedgerEvent } from "@/schemas/domain";
import { importedMatches, type ImportedMatch } from "@/data/matches";
import { ledgerEvents } from "@/data/ledger";
import { reviewedDecisionsSchema } from "@/data/reviewed-decisions";
import { criticalSuspensionEvent, scoreContributions, scoreEvents, uniqueVerifiedEvents } from "./engine";
import { matchTime, nextClubMatch } from "./chronology";
import { buildReviewedEvents } from "./reviewed-events";
import { teams } from "@/data/teams";

const penalty = (overrides: Partial<LedgerEvent> = {}): LedgerEvent => ({ eventId: "P1", season: "2023-24", matchLabel: "Match", eventType: "PENALTY", confidence: 1, quality: "VERIFIED", verificationStatus: "verified", isMock: false, sourceIds: ["https://www.tff.org/"], metadata: { decisionConfirmed: true }, effects: [{ teamId: "gs", category: "PENALTIES", direction: "advantage", kind: "direct", rawImpact: 1, explanation: "Decision" }], ...overrides });
const suspension = () => criticalSuspensionEvent({ eventId: "S1", season: "2023-24", losingTeam: "gs", benefitingTeam: "fb", playerImportance: 1, matchImportance: 2.25, confidence: 1, verified: true });

describe("decision-only scoring", () => {
  it("imported scored and missed decisions populate every team and season", () => {
    for (const season of ["2023-24", "2024-25", "2025-26"]) for (const team of teams) {
      const events = ledgerEvents.filter((e) => e.season === season);
      expect(scoreEvents(events, "general").find((s) => s.teamId === team.id)?.net).not.toBeNull();
    }
    const fred = ledgerEvents.find((e) => e.eventId === "REVIEWED-FRED-2023-DERBY:249333")!;
    expect(fred.metadata?.playerImportance).toBeCloseTo(.764);
    expect(scoreEvents([fred], "general").find((s) => s.teamId === "gs")?.net).toBeCloseTo(.469287);
    expect(scoreEvents([fred], "general").find((s) => s.teamId === "fb")?.net).toBeCloseTo(-.469287);
  });
  it("normal yellow is not a disadvantage", () => {
    const e = penalty({ eventType: "CARD", effects: [{ teamId: "gs", category: "DISCIPLINE", direction: "disadvantage", kind: "direct", rawImpact: 1, explanation: "Yellow" }] });
    expect(scoreEvents([e])[0].net).toBeNull();
  });
  it("rejects events carrying another event type's metric or an inverted suspension", () => {
    const wrongCategory = penalty();
    wrongCategory.effects[0].category = "CRITICAL_SUSPENSION";
    expect(scoreEvents([wrongCategory])[0].net).toBeNull();
    const inverted = suspension();
    inverted.effects[0].direction = "advantage";
    expect(scoreEvents([inverted])[0].net).toBeNull();
  });
  it.each(["referee", "general"] as const)("quarters baseline penalty advantage without changing disadvantage in %s mode", (mode) => {
    const e = penalty();
    e.effects.push({ ...e.effects[0], teamId: "fb", direction: "disadvantage" });
    const scores = scoreEvents([e], mode);
    const benefit = scores.find((s) => s.teamId === "gs")!.direct!;
    const cost = scores.find((s) => s.teamId === "fb")!.disadvantage!;
    expect(benefit).toBeCloseTo(cost * .25);
    expect(cost).toBeCloseTo(mode === "general" ? .08 : .2);
    expect(scoreContributions([e], "gs", mode)[0].amount).toBeCloseTo(benefit);
    expect(scoreEvents([e], mode, false).find((s) => s.teamId === "gs")!.direct).toBeCloseTo(benefit);
  });
  it.each(["referee", "general"] as const)("suspension sides each receive a single 1.95 multiplier in %s mode", (mode) => {
    const scores = scoreEvents([suspension()], mode);
    const cost = scores.find((s) => s.teamId === "gs")!.disadvantage!;
    const benefit = scores.find((s) => s.teamId === "fb")!.indirect!;
    expect(cost).toBeCloseTo(2.25 * .35 * 1.95 * (mode === "general" ? .4 : 1));
    expect(benefit).toBeCloseTo(cost);
    expect(scoreContributions([suspension()], "gs", mode)[0].amount).toBeCloseTo(cost);
    expect(scoreEvents([suspension()], mode, false).find((s) => s.teamId === "gs")!.disadvantage).toBeCloseTo(cost);
    expect(scoreContributions([suspension()], "fb", mode)[0].amount).toBeCloseTo(benefit);
    expect(scoreEvents([suspension()], mode, false).find((s) => s.teamId === "fb")!.indirect).toBeCloseTo(benefit);
    expect(scores.find((s) => s.teamId === "fb")!.indirect).toBeGreaterThan(0);
  });
  it("lineup absence without confirmed ban/rating is never scored", () => {
    const e = suspension(); e.metadata = { reasonConfirmed: false, ratingConfirmed: true };
    expect(scoreEvents([e])[0].net).toBeNull();
    e.metadata = { reasonConfirmed: true, ratingConfirmed: false };
    expect(scoreEvents([e])[0].net).toBeNull();
  });
  it("deduplicates identical events, rejects conflicting duplicate IDs", () => {
    expect(uniqueVerifiedEvents([penalty(), penalty()])).toHaveLength(1);
    expect(() => uniqueVerifiedEvents([penalty(), penalty({ confidence: .5 })])).toThrow("Conflicting");
  });
  it("confidence stays bounded with multiple effects for one team", () => {
    const e = penalty({ confidence: .8 }); e.effects.push({ ...e.effects[0], direction: "disadvantage" });
    expect(scoreEvents([e])[0].confidence).toBe(.8);
    expect(scoreEvents([e])[0].sensitivity).toBeCloseTo(.024);
  });
  it("does not turn missing coverage into a confidence interval", () => {
    const result = scoreEvents([penalty()])[0];
    expect(result.lowerBound).toBeNull(); expect(result.uncertainty).toBeNull();
    expect(result.missingCategories).toContain("PENALTIES");
    expect(scoreEvents([])[0].net).toBeNull();
  });
  it("pending remains excluded even with confidence adjustment off", () => {
    expect(scoreEvents([penalty({ verificationStatus: "pending" })], "general", false)[0].net).toBeNull();
  });
  it("contribution amounts reconstruct the total", () => {
    expect(scoreContributions([penalty()], "gs", "general")[0].amount).toBeCloseTo(scoreEvents([penalty()], "general")[0].net!);
  });
  it("real dataset candidates are retained but not scored", () => {
    expect(ledgerEvents.length).toBeGreaterThan(0);
    expect(ledgerEvents.some((e) => e.metadata?.cardType === "yellow_accumulation")).toBe(true);
    expect(ledgerEvents.every((e) => e.matchId)).toBe(true);
    expect(ledgerEvents.filter((e) => e.metadata?.reasonConfirmed === false).every((e) => e.verificationStatus === "pending")).toBe(true);
  });
});

describe("chronology and JSON intake", () => {
  const fixture = (id: string, week: number, dateText: string): ImportedMatch => ({
    ...importedMatches[0], matchId: id, week, season: "2023-24",
    homeTeam: { tffClubId: "club", sourceName: "Club", teamId: "gs" },
    awayTeam: { tffClubId: "other", sourceName: "Other", teamId: "fb" },
    details: { ...importedMatches[0].details!, dateText, cards: [], lineups: { home: { starters: [], bench: [] }, away: { starters: [], bench: [] } } },
  });
  const origin = fixture("origin", 6, "24.9.2023 - 20:00");
  const postponed = fixture("postponed", 3, "27.9.2023 - 20:00");
  const week7 = fixture("later", 7, "1.10.2023 - 20:00");
  it("finds actual next match even with lower postponed week", () => {
    expect(nextClubMatch([week7, postponed, origin], origin, "club")?.matchId).toBe("postponed");
    expect(matchTime(week7)).toBe(Date.parse("2023-10-01T17:00:00Z"));
  });
  it("does not guess next match when date is unknown", () => {
    expect(nextClubMatch([week7], { ...origin, details: undefined }, "club")).toBeUndefined();
  });
  it("scored/missed/saved penalties have identical decision weight through real JSON intake", () => {
    const scores = ["scored", "missed", "saved"].map((outcome) => {
      const raw = reviewedDecisionsSchema.parse({ schemaVersion: 1, penalties: [{ id: "P", matchId: origin.matchId, benefitingClubId: "club", player: "Player", minute: 35, outcome, sourceUrls: ["https://www.tff.org/"] }], suspensions: [] });
      return scoreEvents(buildReviewedEvents([origin], raw), "general")[0].net;
    });
    expect(scores[0]).toBeCloseTo(.02);
    expect(scores.every((score) => score === scores[0])).toBe(true);
  });
  it("supports yellow accumulation and multiple affected matches with explicit evidence", () => {
    const raw = reviewedDecisionsSchema.parse({ schemaVersion: 1, penalties: [], suspensions: [{
      id: "S", originMatchId: origin.matchId, affectedMatchIds: [postponed.matchId, week7.matchId],
      clubId: "club", playerId: "person", player: "Player", cause: "yellow_accumulation",
      sourceUrls: ["https://www.tff.org/"],
      rating: { value: 8, min: 0, max: 10, valuableThreshold: 7, assessedAt: "2023-09-23T00:00:00Z", sourceUrl: "https://example.org/rating", provider: "Test provider" },
    }] });
    const events = buildReviewedEvents([origin, postponed, week7], raw);
    expect(events.map((e) => e.matchId)).toEqual(["postponed", "later"]);
    expect(scoreEvents(events, "general")[0].net).toBeCloseTo(-.9828);
    raw.suspensions[0].rating.assessedAt = "2023-10-01T00:00:00Z";
    expect(() => buildReviewedEvents([origin, postponed, week7], raw)).toThrow("Invalid suspension");
  });
  it("rejects missing sources and invalid player-rating scales", () => {
    expect(reviewedDecisionsSchema.safeParse({ schemaVersion: 1, penalties: [{ id: "P", matchId: "m", benefitingClubId: "club", player: "P", minute: 1, outcome: "missed", sourceUrls: [] }], suspensions: [] }).success).toBe(false);
  });
});
