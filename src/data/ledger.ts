import type { LedgerEvent } from "@/schemas/domain";
import { importedMatches } from "@/data/matches";
import { reviewedDecisions } from "@/data/reviewed-decisions";
import { matchTime, nextClubMatch } from "@/scoring/chronology";

import { buildReviewedEvents } from "@/scoring/reviewed-events";
import research from "../../data/normalized/suspension-research.json";
const researchById = new Map(research.records.map((record) => [record.eventId, record]));
const reviewed = buildReviewedEvents(importedMatches, reviewedDecisions);
const label = (m: (typeof importedMatches)[number]) => `${m.homeTeam.sourceName} – ${m.awayTeam.sourceName}`;
function suspensionEffects(match: (typeof importedMatches)[number], clubId: string, impact: number, explanation: string): LedgerEvent["effects"] {
  const own = match.homeTeam.tffClubId === clubId ? match.homeTeam : match.awayTeam;
  const opponent = match.homeTeam.tffClubId === clubId ? match.awayTeam : match.homeTeam;
  if (!opponent.teamId) return [];
  return [
    ...(own.teamId ? [{ teamId: own.teamId, category: "CRITICAL_SUSPENSION" as const, direction: "disadvantage" as const, kind: "direct" as const, rawImpact: impact, explanation }] : []),
    { teamId: opponent.teamId, category: "OPPONENT_AVAILABILITY", direction: "advantage", kind: "indirect", rawImpact: impact, explanation: `Rakip eksikliği: ${explanation}` },
  ];
}

// Goal records omit missed penalties: retain them as evidence leads, not a biased index.
const penaltyLeads: LedgerEvent[] = importedMatches.flatMap((match) => (match.details?.goals ?? []).flatMap((goal, index): LedgerEvent[] => {
  if (goal.type !== "penalty" || reviewed.some((e) => e.matchId === match.matchId && e.eventType === "PENALTY" && e.metadata?.player === goal.player && e.metadata?.minute === goal.minute)) return [];
  const own = match.homeTeam.tffClubId === goal.tffClubId ? match.homeTeam : match.awayTeam;
  const opponent = match.homeTeam.tffClubId === goal.tffClubId ? match.awayTeam : match.homeTeam;
  const effects: LedgerEvent["effects"] = [];
  const explanation = `${goal.sourceText}. Penaltı golü gözlendi; kaçan/kurtarılan penaltıların karar envanteri eksik, puanlanmadı.`;
  if (own.teamId) effects.push({ teamId: own.teamId, category: "PENALTIES", direction: "advantage", kind: "direct", rawImpact: 1, explanation });
  if (opponent.teamId) effects.push({ teamId: opponent.teamId, category: "PENALTIES", direction: "disadvantage", kind: "direct", rawImpact: 1, explanation });
  return effects.length ? [{ eventId: `TFF-${match.matchId}-PENALTY-${index}`, matchId: match.matchId, season: match.season, matchLabel: label(match), eventType: "PENALTY", confidence: 0, quality: "PARTIAL", verificationStatus: "pending", isMock: false, sourceIds: [match.detailUrl], effects, metadata: { decisionConfirmed: false } }] : [];
}));
// Counts are leads only: histories, rescissions and competition rules require review.
const suspensionLeads: LedgerEvent[] = [];
const yellowCounts = new Map<string, number>();
for (const origin of [...importedMatches].filter((m) => matchTime(m) !== null).sort((a, b) => matchTime(a)! - matchTime(b)!)) {
  for (const card of origin.details?.cards ?? []) {
    if (!card.tffClubId || !card.tffPersonId) continue;
    const key = `${origin.season}:${card.tffPersonId}`;
    let accumulation = false;
    if (card.type === "yellow") {
      if (origin.details?.cards.some((c) => c.tffPersonId === card.tffPersonId && c.type === "second_yellow")) continue;
      const count = (yellowCounts.get(key) ?? 0) + 1;
      yellowCounts.set(key, count); accumulation = count % 4 === 0;
      if (!accumulation) continue;
    }
    const next = nextClubMatch(importedMatches, origin, card.tffClubId);
    if (!next || reviewed.some((e) => e.matchId === next.matchId && e.metadata?.playerId === card.tffPersonId)) continue;
    const lineup = next.details?.lineups[next.homeTeam.tffClubId === card.tffClubId ? "home" : "away"];
    if (!lineup || [...lineup.starters, ...lineup.bench].some((p) => p.tffPersonId === card.tffPersonId)) continue;
    const explanation = `${card.player}, ${label(origin)} maçında ${accumulation ? "gözlenen sarı kart toplamında dördün katına ulaştı" : card.type === "red" ? "kırmızı kart gördü" : "ikinci sarı kart gördü"}; ${label(next)} kadrosunda yok. Ceza infazı ve bağımsız oyuncu puanı doğrulanmadı; endekse dahil değil.`;
    const effects = suspensionEffects(next, card.tffClubId, 0, explanation);
    if (!effects.length) continue;
    suspensionLeads.push({ eventId: `CANDIDATE-${origin.matchId}-${card.tffPersonId}-${next.matchId}`, matchId: next.matchId, season: next.season, date: next.details?.dateText, matchLabel: label(next), eventType: "SUSPENSION", confidence: 0, quality: "PARTIAL", verificationStatus: "pending", isMock: false, sourceIds: [origin.detailUrl, next.detailUrl], effects, metadata: { originMatchId: origin.matchId, reasonConfirmed: false, ratingConfirmed: false, player: card.player, cardType: accumulation ? "yellow_accumulation" : card.type } });
  }
}
export const ledgerEvents: LedgerEvent[] = [...reviewed, ...penaltyLeads, ...suspensionLeads.map((event) => {
  const evidence = researchById.get(event.eventId);
  if (!evidence) return event;
  const ratingExplanation = evidence.meanRating === null ? " Maç öncesi oyuncu puanı için yeterli/eşleştirilmiş kayıt yok." : ` Kart öncesi ${evidence.priorRatings.length} FotMob maç puanının ortalaması ${evidence.meanRating}/10 (ortak önem eşiği 7). Oyuncu kimlik eşleştirmesi ve cezanın bu maçta infazı ayrıca incelenmelidir.`;
  return { ...event, sourceIds: [...new Set([...event.sourceIds, ...evidence.courtSources, ...evidence.priorRatings.map((r) => r.sourceUrl)])], effects: event.effects.map((effect) => ({ ...effect, explanation: effect.explanation + ratingExplanation })), metadata: { ...event.metadata, preCardRating: evidence.meanRating, preCardRatingSamples: evidence.priorRatings.length, identityMethod: evidence.identityMethod, courtSourceCount: evidence.courtSources.length } };
})];
