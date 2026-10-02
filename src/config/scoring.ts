import type { ScoringWeights } from "@/schemas/domain";

// Model assumption, not a possession-adjusted causal estimate.
export const PENALTY_ADVANTAGE_MULTIPLIER = .25;
export const OPPONENT_ABSENCE_ADVANTAGE_MULTIPLIER = 1.95;
export const CARD_SUSPENSION_DISADVANTAGE_MULTIPLIER = 1.95;

export const DEFAULT_WEIGHTS: ScoringWeights = {
  referee: { DISCIPLINE: .25, CRITICAL_SUSPENSION: .35, PENALTIES: .20, VAR: .20 },
  general: { REFEREE: .40, OPPONENT_AVAILABILITY: .20, SCHEDULE: .10, OPPONENT_STRENGTH: .10, OTHER: .05 },
};

export const REQUIRED_REFEREE_CATEGORIES = ["CRITICAL_SUSPENSION", "PENALTIES", "VAR", "OPPONENT_AVAILABILITY"] as const;
export const REQUIRED_GENERAL_CATEGORIES = [] as const;
