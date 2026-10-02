import { importedMatches } from "@/data/matches";
import { ledgerEvents } from "@/data/ledger";
import { isScorableEvent } from "@/scoring/engine";
import type { SeasonId, TeamId } from "@/schemas/domain";

export function evidenceSummary(teamId: TeamId, season?: SeasonId) {
  const matches = importedMatches.filter((m) => (!season || m.season === season) && (m.homeTeam.teamId === teamId || m.awayTeam.teamId === teamId));
  const cards = matches.flatMap((m) => m.details?.cards ?? []).filter((c) => c.teamId === teamId);
  const events = ledgerEvents.filter((e) => !e.isMock && (!season || e.season === season) && e.effects.some((f) => f.teamId === teamId));
  const observed = (direction: "advantage" | "disadvantage") => matches.flatMap((m) => (m.details?.goals ?? []).filter((g) => g.type === "penalty" && (direction === "advantage" ? g.teamId === teamId : g.teamId !== teamId)));
  const candidate = (category: "CRITICAL_SUSPENSION" | "OPPONENT_AVAILABILITY") => events.filter((e) => !isScorableEvent(e) && e.effects.some((f) => f.teamId === teamId && f.category === category)).length;
  return {
    matches: matches.length, yellow: cards.filter((c) => c.type === "yellow").length,
    red: cards.filter((c) => c.type === "red" || c.type === "second_yellow").length,
    penaltyFor: observed("advantage").length, penaltyAgainst: observed("disadvantage").length,
    ownAbsenceCandidates: candidate("CRITICAL_SUSPENSION"), opponentAbsenceCandidates: candidate("OPPONENT_AVAILABILITY"),
    events, scored: events.filter(isScorableEvent).length,
  };
}
