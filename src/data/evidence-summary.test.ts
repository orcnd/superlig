import { describe, expect, it } from "vitest";
import { evidenceSummary } from "./evidence-summary";
import { importedMatches } from "./matches";
import { teams } from "./teams";
import { ledgerEvents } from "./ledger";

describe("visible evidence vs scoring", () => {
  it("retains populated raw summaries even when reviewed decisions are empty", () => {
    for (const team of teams) {
      const data = evidenceSummary(team.id);
      expect(data.matches).toBeGreaterThan(0);
      expect(data.yellow).toBeGreaterThan(0);
      expect(data.penaltyFor).toBeGreaterThan(0);
      expect(data.events.length).toBeGreaterThan(0);
    }
  });
  it("season and team filters reproduce source records", () => {
    const data = evidenceSummary("gs", "2023-24");
    expect(data.matches).toBe(importedMatches.filter((m) => m.season === "2023-24" && (m.homeTeam.teamId === "gs" || m.awayTeam.teamId === "gs")).length);
    expect(data.opponentAbsenceCandidates).toBe(ledgerEvents.filter((e) => e.season === "2023-24" && e.verificationStatus === "pending" && e.effects.some((f) => f.teamId === "gs" && f.category === "OPPONENT_AVAILABILITY")).length);
  });
});
