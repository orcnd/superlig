import type { LedgerEvent } from "@/schemas/domain";
import type { ImportedMatch } from "@/data/matches";
import type { reviewedDecisions } from "@/data/reviewed-decisions";
import { matchTime } from "@/scoring/chronology";
import { CARD_SUSPENSION_DISADVANTAGE_MULTIPLIER, OPPONENT_ABSENCE_ADVANTAGE_MULTIPLIER, PENALTY_ADVANTAGE_MULTIPLIER } from "@/config/scoring";

export function buildReviewedEvents(matches: ImportedMatch[], decisions: typeof reviewedDecisions): LedgerEvent[] {
const criticalMultiplier = 2.25;
const causeLabels = { red: "kırmızı kart", second_yellow: "ikinci sarı kart", yellow_accumulation: "sarı kart birikimi" };
const label = (m: ImportedMatch) => `${m.homeTeam.sourceName} – ${m.awayTeam.sourceName}`;
const matchById = new Map(matches.map((m) => [m.matchId, m]));
function suspensionEffects(match: ImportedMatch, clubId: string, impact: number, explanation: string): LedgerEvent["effects"] {
  const own = match.homeTeam.tffClubId === clubId ? match.homeTeam : match.awayTeam;
  const opponent = match.homeTeam.tffClubId === clubId ? match.awayTeam : match.homeTeam;
  if (!opponent.teamId) return [];
  return [
    ...(own.teamId ? [{ teamId: own.teamId, category: "CRITICAL_SUSPENSION" as const, direction: "disadvantage" as const, kind: "direct" as const, rawImpact: impact, explanation: `${explanation} Kart-ceza dezavantajına ×${CARD_SUSPENSION_DISADVANTAGE_MULTIPLIER} (önceki ağırlığa göre %50 artış) uygulanır.` }] : []),
    { teamId: opponent.teamId, category: "OPPONENT_AVAILABILITY", direction: "advantage", kind: "indirect", rawImpact: impact, explanation: `Rakip eksikliği: ${explanation} Rakip eksikliği avantajına ×${OPPONENT_ABSENCE_ADVANTAGE_MULTIPLIER} (önceki ağırlığa göre %50 artış) uygulanır.` },
  ];
}
const reviewed: LedgerEvent[] = [];
for (const r of decisions.penalties) {
  const match = matchById.get(r.matchId);
  if (!match || ![match.homeTeam.tffClubId, match.awayTeam.tffClubId].includes(r.benefitingClubId)) throw new Error(`Invalid penalty match: ${r.id}`);
  const own = match.homeTeam.tffClubId === r.benefitingClubId ? match.homeTeam : match.awayTeam;
  const opponent = match.homeTeam.tffClubId === r.benefitingClubId ? match.awayTeam : match.homeTeam;
  const effects: LedgerEvent["effects"] = [];
  if (own.teamId) effects.push({ teamId: own.teamId, category: "PENALTIES", direction: "advantage", kind: "direct", rawImpact: 1, explanation: `${r.player} için verilen penaltı (${r.minute}. dakika); lehine penaltı katsayısı ×${PENALTY_ADVANTAGE_MULTIPLIER} uygulanır. Gol/kaçırma sonucu puanı değiştirmez; topla oynama verisiyle düzeltme yapılmamıştır.` });
  if (opponent.teamId) effects.push({ teamId: opponent.teamId, category: "PENALTIES", direction: "disadvantage", kind: "direct", rawImpact: 1, explanation: `${r.minute}. dakikada rakibe verilen penaltı; sonucu puanı değiştirmez.` });
  reviewed.push({ eventId: r.id, matchId: match.matchId, season: match.season, date: match.details?.dateText, matchLabel: label(match), eventType: "PENALTY", confidence: 1, quality: "VERIFIED", verificationStatus: "verified", isMock: false, sourceIds: r.sourceUrls, effects, metadata: { decisionConfirmed: true, outcomeWeighted: false, clubId: r.benefitingClubId, minute: r.minute, player: r.player } });
}
for (const r of decisions.suspensions) for (const id of r.affectedMatchIds) {
  const origin = matchById.get(r.originMatchId), match = matchById.get(id);
  if (!origin || !match || origin.season !== match.season || ![match.homeTeam.tffClubId, match.awayTeam.tffClubId].includes(r.clubId) || ![origin.homeTeam.tffClubId, origin.awayTeam.tffClubId].includes(r.clubId) || matchTime(origin) === null || matchTime(match) === null || matchTime(match)! <= matchTime(origin)! || Date.parse(r.rating.assessedAt) > matchTime(origin)!) throw new Error(`Invalid suspension match/rating: ${r.id}`);
  const lineup = match.details?.lineups[match.homeTeam.tffClubId === r.clubId ? "home" : "away"];
  if (!lineup || [...lineup.starters, ...lineup.bench].some((p) => p.tffPersonId === r.playerId)) throw new Error(`Suspended player present or lineup missing: ${r.id}`);
  if (r.rating.value < r.rating.valuableThreshold) continue;
  const importance = (r.rating.value - r.rating.min) / (r.rating.max - r.rating.min);
  const effects = suspensionEffects(match, r.clubId, importance * criticalMultiplier, `${r.player}, ${label(origin)} maçındaki ${causeLabels[r.cause]} nedeniyle bu maçta oynayamadı. Karttan önceki oyuncu puanı ${r.rating.value}; önemli maçta oyuncu kaybı hesaba katıldı.`);
  if (!effects.length) continue;
  reviewed.push({ eventId: `${r.id}:${id}`, matchId: id, season: match.season, date: match.details?.dateText, matchLabel: label(match), eventType: "SUSPENSION", confidence: 1, quality: "VERIFIED", verificationStatus: "verified", isMock: false, sourceIds: [...r.sourceUrls, r.rating.sourceUrl, origin.detailUrl, match.detailUrl], effects, metadata: { originMatchId: origin.matchId, reasonConfirmed: true, ratingConfirmed: true, playerImportance: importance, player: r.player, playerId: r.playerId } });
}

  const keys = new Set<string>();
  for (const event of reviewed) {
    const key = event.eventType === "SUSPENSION" ? `${event.matchId}:${event.metadata?.playerId}` : `${event.matchId}:${event.metadata?.clubId}:${event.metadata?.minute}`;
    if (keys.has(key)) throw new Error(`Duplicate reviewed decision: ${key}`);
    keys.add(key);
  }
  return reviewed;
}
