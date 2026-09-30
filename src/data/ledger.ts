import type { LedgerEvent } from "@/schemas/domain";
import { importedMatches } from "@/data/matches";
import { allFixtures } from "@/data/fixtures";

const cardImpact = { yellow: 0.2, second_yellow: 1, red: 2 } as const;

const cardEvents: LedgerEvent[] = importedMatches.flatMap((match) => {
  const cards = match.details?.cards ?? [];
  return cards.flatMap((card, cardIndex): LedgerEvent[] => {
    const sanctionedTeam = card.teamId;
    const otherBigFourTeam = match.homeTeam.teamId === sanctionedTeam
      ? match.awayTeam.teamId
      : match.homeTeam.teamId;
    const effects: LedgerEvent["effects"] = [];
    const impact = cardImpact[card.type];

    if (sanctionedTeam) {
      effects.push({
        teamId: sanctionedTeam,
        category: "DISCIPLINE",
        direction: "disadvantage",
        kind: "direct",
        rawImpact: impact,
        explanation: `${card.player}: ${card.sourceText}`,
      });
    }
    if (otherBigFourTeam) {
      effects.push({
        teamId: otherBigFourTeam,
        category: "DISCIPLINE",
        direction: "advantage",
        kind: "direct",
        rawImpact: impact,
        explanation: `Rakip kartı: ${card.player} (${card.sourceText})`,
      });
    }
    if (!effects.length) return [];

    return [{
      eventId: `TFF-${match.matchId}-CARD-${cardIndex + 1}`,
      season: match.season,
      date: match.details?.dateText,
      matchLabel: `${match.homeTeam.sourceName} – ${match.awayTeam.sourceName}`,
      eventType: "CARD",
      confidence: 1,
      quality: "VERIFIED",
      verificationStatus: "verified",
      isMock: false,
      sourceIds: [match.detailUrl],
      effects,
      metadata: { player: card.player, type: card.type, minute: card.minute },
    }];
  });
});

const penaltyEvents: LedgerEvent[] = importedMatches.flatMap((match) =>
  (match.details?.goals ?? []).flatMap((goal, goalIndex): LedgerEvent[] => {
    if (goal.type !== "penalty") return [];
    const benefitingTeam = goal.teamId;
    const disadvantagedTeam = match.homeTeam.teamId === benefitingTeam ? match.awayTeam.teamId : match.homeTeam.teamId;
    const effects: LedgerEvent["effects"] = [];
    if (benefitingTeam) effects.push({ teamId: benefitingTeam, category: "PENALTIES", direction: "advantage", kind: "direct", rawImpact: 1, explanation: `TFF gol kaydı: ${goal.sourceText}` });
    if (disadvantagedTeam) effects.push({ teamId: disadvantagedTeam, category: "PENALTIES", direction: "disadvantage", kind: "direct", rawImpact: 1, explanation: `Rakibin penaltı golü: ${goal.sourceText}` });
    if (!effects.length) return [];
    return [{ eventId: `TFF-${match.matchId}-PENALTY-GOAL-${goalIndex + 1}`, season: match.season, date: match.details?.dateText, matchLabel: `${match.homeTeam.sourceName} – ${match.awayTeam.sourceName}`, eventType: "PENALTY", confidence: 1, quality: "VERIFIED", verificationStatus: "verified", isMock: false, sourceIds: [match.detailUrl], effects, metadata: { player: goal.player, minute: goal.minute, evidence: "scored_penalty_not_decision_correctness" } }];
  })
);

function parseTffDate(value: string | undefined) {
  const match = value?.match(/(\d{2})\.(\d{2})\.(\d{4})\s*-\s*(\d{2}):(\d{2})/);
  return match ? Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]), Number(match[4]), Number(match[5])) : null;
}

const scheduleEvents: LedgerEvent[] = [];
for (const season of ["2023-24", "2024-25", "2025-26"] as const) {
  for (const teamId of ["gs", "fb", "bjk", "ts"] as const) {
    const matches = importedMatches
      .filter((match) => match.season === season && (match.homeTeam.teamId === teamId || match.awayTeam.teamId === teamId))
      .map((match) => ({ match, time: parseTffDate(match.details?.dateText) }))
      .filter((item): item is { match: typeof item.match; time: number } => item.time !== null)
      .sort((a, b) => a.time - b.time);
    for (let index = 1; index < matches.length; index++) {
      const current = matches[index];
      const restDays = (current.time - matches[index - 1].time) / 86_400_000;
      if (restDays >= 6 && restDays <= 8) continue;
      const direction = restDays < 6 ? "disadvantage" : "advantage";
      scheduleEvents.push({ eventId: `TFF-${current.match.matchId}-${teamId}-REST`, season, date: current.match.details?.dateText, matchLabel: `${current.match.homeTeam.sourceName} – ${current.match.awayTeam.sourceName}`, eventType: "SCHEDULE", confidence: 1, quality: "VERIFIED", verificationStatus: "verified", isMock: false, sourceIds: [current.match.detailUrl], effects: [{ teamId, category: "SCHEDULE", direction, kind: "direct", rawImpact: Math.min(2, Math.abs(restDays - 7) / 3), explanation: `Önceki lig maçından bu yana ${restDays.toFixed(1)} gün` }], metadata: { restDays: Number(restDays.toFixed(2)), scope: "league_matches_only" } });
    }
  }
}

type Standing = { played: number; points: number };
const opponentStrengthEvents: LedgerEvent[] = [];
for (const season of ["2023-24", "2024-25", "2025-26"] as const) {
  const seasonFixtures = allFixtures.filter((fixture) => fixture.season === season && fixture.score.home !== null && fixture.score.away !== null);
  const standings = new Map<string, Standing>();
  const update = (clubId: string, points: number) => { const row = standings.get(clubId) ?? { played: 0, points: 0 }; row.played++; row.points += points; standings.set(clubId, row); };
  const weeks = [...new Set(seasonFixtures.map((fixture) => fixture.week))].sort((a, b) => a - b);
  for (const week of weeks) {
    for (const match of importedMatches.filter((item) => item.season === season && item.week === week)) {
      for (const teamId of [match.homeTeam.teamId, match.awayTeam.teamId].filter(Boolean) as Array<"gs" | "fb" | "bjk" | "ts">) {
        const opponent = match.homeTeam.teamId === teamId ? match.awayTeam : match.homeTeam;
        const row = opponent.tffClubId ? standings.get(opponent.tffClubId) : undefined;
        if (!row || row.played < 3) continue;
        const opponentPpg = row.points / row.played;
        const delta = opponentPpg - 1.35;
        if (Math.abs(delta) < 0.05) continue;
        opponentStrengthEvents.push({ eventId: `TFF-${match.matchId}-${teamId}-OPPONENT-STRENGTH`, season, date: match.details?.dateText, matchLabel: `${match.homeTeam.sourceName} – ${match.awayTeam.sourceName}`, eventType: "OPPONENT_STRENGTH", confidence: 1, quality: "VERIFIED", verificationStatus: "verified", isMock: false, sourceIds: [match.detailUrl], effects: [{ teamId, category: "OPPONENT_STRENGTH", direction: delta > 0 ? "disadvantage" : "advantage", kind: "direct", rawImpact: Math.abs(delta), explanation: `Rakibin maç öncesi puan ortalaması ${opponentPpg.toFixed(2)}` }], metadata: { opponentPpg: Number(opponentPpg.toFixed(3)), benchmarkPpg: 1.35 } });
      }
    }
    for (const fixture of seasonFixtures.filter((item) => item.week === week)) {
      const home = fixture.score.home!; const away = fixture.score.away!;
      update(fixture.homeTeam.tffClubId, home > away ? 3 : home === away ? 1 : 0);
      update(fixture.awayTeam.tffClubId, away > home ? 3 : away === home ? 1 : 0);
    }
  }
}

const suspensionEvents: LedgerEvent[] = [];
const suspensionAbsenceKeys = new Set<string>();
const lineupFor = (match: (typeof importedMatches)[number], teamId: "gs" | "fb" | "bjk" | "ts") => {
  const side = match.homeTeam.teamId === teamId ? "home" : "away";
  return match.details?.lineups[side];
};
for (const season of ["2023-24", "2024-25", "2025-26"] as const) {
  for (const teamId of ["gs", "fb", "bjk", "ts"] as const) {
    const matches = importedMatches.filter((match) => match.season === season && (match.homeTeam.teamId === teamId || match.awayTeam.teamId === teamId)).sort((a, b) => a.week - b.week);
    for (let index = 0; index < matches.length - 1; index++) {
      const origin = matches[index]; const next = matches[index + 1];
      const dismissals = (origin.details?.cards ?? []).filter((card) => card.teamId === teamId && (card.type === "red" || card.type === "second_yellow") && card.tffPersonId);
      const nextPlayers = new Set([...(lineupFor(next, teamId)?.starters ?? []), ...(lineupFor(next, teamId)?.bench ?? [])].map((player) => player.tffPersonId));
      for (const card of dismissals) {
        if (nextPlayers.has(card.tffPersonId)) continue;
        const prior = matches.slice(Math.max(0, index - 4), index + 1);
        const starts = prior.filter((match) => lineupFor(match, teamId)?.starters.some((player) => player.tffPersonId === card.tffPersonId)).length;
        const opponentTeam = next.homeTeam.teamId === teamId ? next.awayTeam.teamId : next.homeTeam.teamId;
        const importance = Math.max(.5, starts / Math.max(1, prior.length));
        const impact = importance * (opponentTeam ? 1.5 : 1);
        const effects: LedgerEvent["effects"] = [{ teamId, category: "CRITICAL_SUSPENSION", direction: "disadvantage", kind: "direct", rawImpact: impact, explanation: `${card.player}, kart sonrası bir sonraki lig maçının kadrosunda yok` }];
        if (opponentTeam) effects.push({ teamId: opponentTeam, category: "OPPONENT_AVAILABILITY", direction: "advantage", kind: "indirect", rawImpact: impact, explanation: `Rakipte kart sonrası eksik: ${card.player}` });
        suspensionAbsenceKeys.add(`${next.matchId}:${teamId}:${card.tffPersonId}`);
        suspensionEvents.push({ eventId: `TFF-${origin.matchId}-${card.tffPersonId}-NEXT-MATCH-ABSENCE`, season, date: next.details?.dateText, matchLabel: `${next.homeTeam.sourceName} – ${next.awayTeam.sourceName}`, eventType: "SUSPENSION", confidence: .85, quality: "PARTIAL", verificationStatus: "verified", isMock: false, sourceIds: [origin.detailUrl, next.detailUrl], effects, metadata: { originMatchId: origin.matchId, nextMatchId: next.matchId, player: card.player, cardType: card.type, method: "post_card_lineup_absence", reasonConfirmed: false } });
      }
    }
  }
}

const availabilityEvents: LedgerEvent[] = [];
for (const season of ["2023-24", "2024-25", "2025-26"] as const) {
  for (const teamId of ["gs", "fb", "bjk", "ts"] as const) {
    const matches = importedMatches.filter((match) => match.season === season && (match.homeTeam.teamId === teamId || match.awayTeam.teamId === teamId)).sort((a, b) => a.week - b.week);
    for (let index = 5; index < matches.length; index++) {
      const current = matches[index]; const prior = matches.slice(index - 5, index);
      const startCounts = new Map<string, { name: string; count: number }>();
      for (const match of prior) for (const player of lineupFor(match, teamId)?.starters ?? []) if (player.tffPersonId) {
        const row = startCounts.get(player.tffPersonId) ?? { name: player.name, count: 0 }; row.count++; startCounts.set(player.tffPersonId, row);
      }
      const currentPlayers = new Set([...(lineupFor(current, teamId)?.starters ?? []), ...(lineupFor(current, teamId)?.bench ?? [])].map((player) => player.tffPersonId));
      const missing = [...startCounts.entries()].filter(([playerId, row]) => row.count >= 3 && !currentPlayers.has(playerId) && !suspensionAbsenceKeys.has(`${current.matchId}:${teamId}:${playerId}`));
      if (!missing.length) continue;
      const impact = Math.min(3, missing.reduce((sum, [, row]) => sum + row.count / 5, 0) * .4);
      const opponentTeam = current.homeTeam.teamId === teamId ? current.awayTeam.teamId : current.homeTeam.teamId;
      const names = missing.map(([, row]) => row.name).join(", ");
      const effects: LedgerEvent["effects"] = [{ teamId, category: "INJURIES", direction: "disadvantage", kind: "direct", rawImpact: impact, explanation: `Son 5 maçta düzenli başlayan fakat maç kadrosunda olmayan oyuncular: ${names}` }];
      if (opponentTeam) effects.push({ teamId: opponentTeam, category: "OPPONENT_AVAILABILITY", direction: "advantage", kind: "indirect", rawImpact: impact, explanation: `Rakibin kadro sürekliliği kaybı: ${names}` });
      availabilityEvents.push({ eventId: `TFF-${current.matchId}-${teamId}-LINEUP-CONTINUITY`, season, date: current.details?.dateText, matchLabel: `${current.homeTeam.sourceName} – ${current.awayTeam.sourceName}`, eventType: "INJURY", confidence: .65, quality: "PARTIAL", verificationStatus: "verified", isMock: false, sourceIds: [current.detailUrl, ...prior.map((match) => match.detailUrl)], effects, metadata: { missingCorePlayers: missing.length, playerNames: names, method: "five_match_lineup_continuity", injuryReasonConfirmed: false } });
    }
  }
}

// Research leads only. Pending/mock records are deliberately excluded by the scoring engine.
export const ledgerEvents: LedgerEvent[] = [
  ...cardEvents,
  ...penaltyEvents,
  ...scheduleEvents,
  ...opponentStrengthEvents,
  ...suspensionEvents,
  ...availabilityEvents,
  { eventId: "PENDING-2324-FB-CRITICAL-01", season: "2023-24", matchLabel: "Doğrulama bekleyen kritik ceza örneği", eventType: "SUSPENSION", confidence: .3, quality: "UNKNOWN", verificationStatus: "pending", isMock: true, sourceIds: [], effects: [
    { teamId: "fb", category: "CRITICAL_SUSPENSION", direction: "disadvantage", kind: "direct", rawImpact: 3, explanation: "Oyuncu kaybı — yalnızca veri modeli örneği" },
    { teamId: "gs", category: "CRITICAL_SUSPENSION", direction: "advantage", kind: "indirect", rawImpact: 3, explanation: "Rakip eksikliği — aynı temel olayın karşı kaydı" },
  ]},
];
