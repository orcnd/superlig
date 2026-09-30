import { DEFAULT_WEIGHTS, REQUIRED_GENERAL_CATEGORIES, REQUIRED_REFEREE_CATEGORIES } from "@/config/scoring";
import { teams } from "@/data/teams";
import type { Category, LedgerEvent, ScoringWeights, TeamId, TeamScore } from "@/schemas/domain";

const refereeCategories = new Set<Category>(["DISCIPLINE", "CRITICAL_SUSPENSION", "PENALTIES", "VAR", "OTHER_REFEREE"]);
const eligible = (event: LedgerEvent) => !event.isMock && event.verificationStatus === "verified" && event.quality !== "UNKNOWN";
export function uniqueVerifiedEvents(events: LedgerEvent[]) { return [...new Map(events.filter(eligible).map((event) => [event.eventId, event])).values()]; }

export function scoreEvents(events: LedgerEvent[], mode: "referee" | "general" = "referee", confidenceAdjusted = true, weights: ScoringWeights = DEFAULT_WEIGHTS): TeamScore[] {
  const unique = uniqueVerifiedEvents(events);
  return teams.map((team) => {
    const relevant = unique.filter((event) => event.effects.some((effect) => effect.teamId === team.id && (mode === "general" || refereeCategories.has(effect.category))));
    const seen = new Set<Category>(); let direct = 0; let indirect = 0; let disadvantage = 0; let confidenceTotal = 0;
    for (const event of relevant) for (const effect of event.effects.filter((item) => item.teamId === team.id)) {
      if (mode === "referee" && !refereeCategories.has(effect.category)) continue;
      seen.add(effect.category); const factor = confidenceAdjusted ? event.confidence : 1;
      const refereeWeight = refereeCategories.has(effect.category) ? weights.referee[effect.category as keyof ScoringWeights["referee"]] : 1;
      const generalKey = effect.category === "INJURIES" ? "INJURIES" : effect.category === "SCHEDULE" ? "SCHEDULE" : effect.category === "OPPONENT_AVAILABILITY" ? "OPPONENT_AVAILABILITY" : effect.category === "OPPONENT_STRENGTH" ? "OPPONENT_STRENGTH" : effect.category === "OTHER" ? "OTHER" : "REFEREE";
      const categoryWeight = mode === "referee" ? refereeWeight : weights.general[generalKey] * (generalKey === "REFEREE" ? refereeWeight : 1);
      const amount = effect.rawImpact * factor * categoryWeight;
      if (effect.direction === "disadvantage") disadvantage += amount; else if (effect.kind === "indirect") indirect += amount; else direct += amount;
      confidenceTotal += event.confidence;
    }
    const required = mode === "referee" ? REQUIRED_REFEREE_CATEGORIES : [...REQUIRED_REFEREE_CATEGORIES, ...REQUIRED_GENERAL_CATEGORIES];
    const missingCategories = required.filter((category) => !seen.has(category)) as Category[];
    if (!relevant.length) return { teamId: team.id, direct: null, indirect: null, disadvantage: null, net: null, confidence: null, eventCount: 0, missingCategories };
    return { teamId: team.id, direct, indirect, disadvantage, net: direct + indirect - disadvantage, confidence: confidenceTotal / relevant.length, eventCount: relevant.length, missingCategories };
  });
}

export function criticalSuspensionEvent(input: { eventId: string; season: LedgerEvent["season"]; losingTeam: TeamId; benefitingTeam: TeamId; playerImportance: number; matchImportance: number; confidence: number; verified?: boolean }): LedgerEvent {
  const impact = input.playerImportance * input.matchImportance;
  return { eventId: input.eventId, season: input.season, matchLabel: "Critical match", eventType: "SUSPENSION", confidence: input.confidence, quality: input.verified ? "VERIFIED" : "UNKNOWN", verificationStatus: input.verified ? "verified" : "pending", isMock: !input.verified, sourceIds: input.verified ? ["test-source"] : [], effects: [
    { teamId: input.losingTeam, category: "CRITICAL_SUSPENSION", direction: "disadvantage", kind: "direct", rawImpact: impact, explanation: "Critical player loss" },
    { teamId: input.benefitingTeam, category: "CRITICAL_SUSPENSION", direction: "advantage", kind: "indirect", rawImpact: impact, explanation: "Opponent critical absence benefit" },
  ]};
}
