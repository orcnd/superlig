export type SeasonId = "2023-24" | "2024-25" | "2025-26";
export type TeamId = "gs" | "fb" | "bjk" | "ts";
export type DataQuality = "VERIFIED" | "CROSS_VERIFIED" | "ESTIMATED" | "PARTIAL" | "UNKNOWN";
export type VerificationStatus = "verified" | "pending" | "rejected";
export type EventType = "CARD" | "SUSPENSION" | "PENALTY" | "VAR" | "INJURY" | "SCHEDULE" | "OPPONENT_STRENGTH" | "OTHER";
export type Category = "DISCIPLINE" | "CRITICAL_SUSPENSION" | "PENALTIES" | "VAR" | "SCHEDULE" | "OPPONENT_AVAILABILITY" | "OPPONENT_STRENGTH" | "OTHER";
export type Direction = "advantage" | "disadvantage";
export type EffectKind = "direct" | "indirect";

export interface Source { id: string; title: string; publisher: string; url: string; publishedDate?: string; retrievedAt: string; sourceType: "official" | "federation" | "stats_provider" | "news" | "club" | "other"; reliability: number; supports: string[] }
export interface LedgerEffect { teamId: TeamId; category: Category; direction: Direction; kind: EffectKind; rawImpact: number; explanation: string }
export interface LedgerEvent { eventId: string; matchId?: string; season: SeasonId; date?: string; matchLabel: string; eventType: EventType; confidence: number; quality: DataQuality; verificationStatus: VerificationStatus; isMock: boolean; sourceIds: string[]; effects: LedgerEffect[]; metadata?: Record<string, string | number | boolean | null> }
export interface ScoringWeights { referee: Record<"DISCIPLINE" | "CRITICAL_SUSPENSION" | "PENALTIES" | "VAR", number>; general: Record<"REFEREE" | "OPPONENT_AVAILABILITY" | "SCHEDULE" | "OPPONENT_STRENGTH" | "OTHER", number> }
export interface TeamScore { teamId: TeamId; direct: number | null; indirect: number | null; disadvantage: number | null; net: number | null; confidence: number | null; uncertainty: number | null; sensitivity: number | null; lowerBound: number | null; upperBound: number | null; eventCount: number; missingCategories: Category[] }
export interface Team { id: TeamId; name: string; shortName: string; slug: string; color: string; logoUrl: string }
