import { CARD_SUSPENSION_DISADVANTAGE_MULTIPLIER, DEFAULT_WEIGHTS, OPPONENT_ABSENCE_ADVANTAGE_MULTIPLIER, PENALTY_ADVANTAGE_MULTIPLIER, REQUIRED_REFEREE_CATEGORIES } from "@/config/scoring";
import { teams } from "@/data/teams";
import type { Category, LedgerEvent, ScoringWeights, TeamId, TeamScore } from "@/schemas/domain";

const refereeCategories = new Set<Category>(["CRITICAL_SUSPENSION", "OPPONENT_AVAILABILITY", "PENALTIES", "VAR"]);
const matchesEventCategory = (event: LedgerEvent) => event.effects.every((effect) =>
  event.eventType === "PENALTY" ? effect.category === "PENALTIES"
    : event.eventType === "VAR" ? effect.category === "VAR"
    : event.eventType === "SUSPENSION" ? (
      effect.category === "CRITICAL_SUSPENSION" && effect.direction === "disadvantage" && effect.kind === "direct"
      || effect.category === "OPPONENT_AVAILABILITY" && effect.direction === "advantage" && effect.kind === "indirect"
    ) : false);
export const isScorableEvent = (e: LedgerEvent) => !e.isMock && e.verificationStatus === "verified" &&
  (e.quality === "VERIFIED" || e.quality === "CROSS_VERIFIED") && e.sourceIds.length > 0 &&
  Number.isFinite(e.confidence) && e.confidence >= 0 && e.confidence <= 1 &&
  e.effects.length > 0 && matchesEventCategory(e) && e.effects.every((f) => refereeCategories.has(f.category) && Number.isFinite(f.rawImpact) && f.rawImpact >= 0) &&
  (e.eventType === "SUSPENSION" ? e.metadata?.reasonConfirmed === true && e.metadata?.ratingConfirmed === true :
    e.eventType === "PENALTY" || e.eventType === "VAR" ? e.metadata?.decisionConfirmed === true : false);
export function uniqueVerifiedEvents(events: LedgerEvent[]) {
  const unique = new Map<string, LedgerEvent>();
  for (const event of events.filter(isScorableEvent)) {
    const previous = unique.get(event.eventId);
    if (previous && JSON.stringify(previous) !== JSON.stringify(event)) throw new Error(`Conflicting eventId: ${event.eventId}`);
    unique.set(event.eventId, event);
  }
  return [...unique.values()];
}
export type ScoreContribution = { eventId: string; eventType: LedgerEvent["eventType"]; category: Category; matchLabel: string; explanation: string; sourceUrl: string; direction: "advantage" | "disadvantage"; kind: "direct" | "indirect"; amount: number };
function effectiveCategory(category: Category) {
  return category === "OPPONENT_AVAILABILITY" ? "CRITICAL_SUSPENSION" : category;
}
function weightedAmount(effect: LedgerEvent["effects"][number], event: LedgerEvent, mode: "referee" | "general", confidenceAdjusted: boolean, weights: ScoringWeights) {
  const category = effectiveCategory(effect.category) as keyof ScoringWeights["referee"];
  // Same base category; explicit directional multipliers are model choices.
  const directionMultiplier = effect.direction !== "advantage"
    ? (effect.category === "CRITICAL_SUSPENSION" ? CARD_SUSPENSION_DISADVANTAGE_MULTIPLIER : 1)
    : effect.category === "PENALTIES" ? PENALTY_ADVANTAGE_MULTIPLIER
    : effect.category === "OPPONENT_AVAILABILITY" ? OPPONENT_ABSENCE_ADVANTAGE_MULTIPLIER : 1;
  return effect.rawImpact * directionMultiplier * (confidenceAdjusted ? event.confidence : 1) * weights.referee[category] * (mode === "general" ? weights.general.REFEREE : 1);
}
export function scoreContributions(events: LedgerEvent[], teamId: TeamId, mode: "referee" | "general" = "referee", confidenceAdjusted = true, weights: ScoringWeights = DEFAULT_WEIGHTS): ScoreContribution[] {
  return uniqueVerifiedEvents(events).flatMap((event) => event.effects.filter((effect) => effect.teamId === teamId).map((effect) => ({ eventId: event.eventId, eventType: event.eventType, category: effect.category, matchLabel: event.matchLabel, explanation: effect.explanation, sourceUrl: event.sourceIds[0] ?? "", direction: effect.direction, kind: effect.kind, amount: weightedAmount(effect, event, mode, confidenceAdjusted, weights) })));
}
export function scoreEvents(events: LedgerEvent[], mode: "referee" | "general" = "referee", confidenceAdjusted = true, weights: ScoringWeights = DEFAULT_WEIGHTS): TeamScore[] {
  const unique = uniqueVerifiedEvents(events);
  return teams.map((team) => {
    const relevant = unique.filter((event) => event.effects.some((effect) => effect.teamId === team.id));
    // Presence of an event does not establish complete coverage of that category.
    const missingCategories: Category[] = [...REQUIRED_REFEREE_CATEGORIES];
    if (!relevant.length) return { teamId: team.id, direct: null, indirect: null, disadvantage: null, net: null, confidence: null, uncertainty: null, sensitivity: null, lowerBound: null, upperBound: null, eventCount: 0, missingCategories };
    let direct = 0, indirect = 0, disadvantage = 0;
    const categoryTotals = new Map<Category, number>();
    for (const event of relevant) for (const effect of event.effects.filter((f) => f.teamId === team.id)) {
      const amount = weightedAmount(effect, event, mode, confidenceAdjusted, weights);
      if (effect.direction === "disadvantage") disadvantage += amount;
      else if (effect.kind === "indirect") indirect += amount;
      else direct += amount;
      const category = effectiveCategory(effect.category);
      categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + (effect.direction === "disadvantage" ? -amount : amount));
    }
    return { teamId: team.id, direct, indirect, disadvantage, net: direct + indirect - disadvantage,
      confidence: relevant.reduce((sum, event) => sum + event.confidence, 0) / relevant.length,
      // Missing decisions cannot be represented by a statistical confidence interval.
      uncertainty: null, lowerBound: null, upperBound: null,
      sensitivity: [...categoryTotals.values()].reduce((sum, amount) => sum + Math.abs(amount) * .2, 0),
      eventCount: relevant.length, missingCategories };
  });
}
export function criticalSuspensionEvent(input: { eventId: string; season: LedgerEvent["season"]; losingTeam: TeamId; benefitingTeam: TeamId; playerImportance: number; matchImportance: number; confidence: number; verified?: boolean }): LedgerEvent {
  const impact = input.playerImportance * input.matchImportance;
  return { eventId: input.eventId, season: input.season, matchLabel: "Critical match", eventType: "SUSPENSION", confidence: input.confidence, quality: input.verified ? "VERIFIED" : "UNKNOWN", verificationStatus: input.verified ? "verified" : "pending", isMock: !input.verified, sourceIds: input.verified ? ["test-source"] : [], metadata: { reasonConfirmed: !!input.verified, ratingConfirmed: !!input.verified }, effects: [
    { teamId: input.losingTeam, category: "CRITICAL_SUSPENSION", direction: "disadvantage", kind: "direct", rawImpact: impact, explanation: "Critical player loss" },
    { teamId: input.benefitingTeam, category: "OPPONENT_AVAILABILITY", direction: "advantage", kind: "indirect", rawImpact: impact, explanation: "Opponent critical absence benefit" },
  ] };
}
