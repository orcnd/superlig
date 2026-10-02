import { readFile, writeFile } from "node:fs/promises";
const matches = JSON.parse(await readFile("data/normalized/superlig-matches.json", "utf8")).records;
const ratings = JSON.parse(await readFile("data/raw/fotmob-match-evidence.json", "utf8")).records;
const court = JSON.parse(await readFile("data/raw/tff-disciplinary-evidence.json", "utf8")).sources;
const providerByMatch = new Map(ratings.map((m) => [m.matchId, m]));
const timestamp = (m) => { const p = m.details?.dateText.match(/(\d+)\.(\d+)\.(\d+)\s*-\s*(\d+):(\d+)/); return p ? Date.UTC(+p[3], +p[2] - 1, +p[1], +p[4] - 3, +p[5]) : null; };
const normal = (name) => name.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]/g, "");
const records = [], counts = new Map();
for (const origin of [...matches].filter((m) => timestamp(m) !== null).sort((a, b) => timestamp(a) - timestamp(b))) for (const card of origin.details?.cards ?? []) {
  if (!card.tffClubId || !card.tffPersonId) continue;
  let accumulation = false;
  if (card.type === "yellow") {
    if (origin.details.cards.some((c) => c.tffPersonId === card.tffPersonId && c.type === "second_yellow")) continue;
    const key = `${origin.season}:${card.tffPersonId}`, count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count); accumulation = count % 4 === 0;
    if (!accumulation) continue;
  }
  const next = matches.filter((m) => m.season === origin.season && timestamp(m) > timestamp(origin) && (m.homeTeam.tffClubId === card.tffClubId || m.awayTeam.tffClubId === card.tffClubId)).sort((a, b) => timestamp(a) - timestamp(b))[0];
  if (!next || !(next.homeTeam.tffClubId === card.tffClubId ? next.awayTeam.teamId : next.homeTeam.teamId)) continue;
  const lineup = next.details?.lineups[next.homeTeam.tffClubId === card.tffClubId ? "home" : "away"];
  if (!lineup || [...lineup.starters, ...lineup.bench].some((p) => p.tffPersonId === card.tffPersonId)) continue;
  const providerOrigin = providerByMatch.get(origin.matchId);
  const matchingCards = (providerOrigin?.events ?? []).filter((e) => e.type === "Card" && e.isHome === (card.side === "home") && e.time === card.minute && e.card === ({ yellow: "Yellow", red: "Red", second_yellow: "YellowRed" })[card.type]);
  const named = matchingCards.filter((e) => normal(e.fullName ?? e.nameStr ?? e.player?.name ?? "") === normal(card.player));
  const identity = named.length === 1 ? named[0] : matchingCards.length === 1 ? matchingCards[0] : null;
  const prior = identity ? ratings.filter((m) => m.season === origin.season && Date.parse(m.playedAt) < timestamp(origin)).sort((a, b) => Date.parse(b.playedAt) - Date.parse(a.playedAt)).flatMap((m) => m.players.filter((p) => p.clubId === card.tffClubId && p.providerPlayerId === String(identity.playerId) && p.rating !== null).map((p) => ({ rating: p.rating, playedAt: m.playedAt, matchId: m.matchId, sourceUrl: m.sourceUrl }))).slice(0, 5) : [];
  const courtSources = court.filter((d) => d.matches.some((m) => m.originMatchId === origin.matchId && m.playerId === card.tffPersonId)).map((d) => d.sourceUrl);
  records.push({ eventId: `CANDIDATE-${origin.matchId}-${card.tffPersonId}-${next.matchId}`, originMatchId: origin.matchId, affectedMatchId: next.matchId, season: origin.season, player: card.player, playerId: card.tffPersonId, providerPlayerId: identity ? String(identity.playerId) : null, identityMethod: named.length === 1 ? "name_and_card" : identity ? "unique_card_time_side_type_requires_review" : "unresolved", cardType: accumulation ? "yellow_accumulation" : card.type, priorRatings: prior, meanRating: prior.length >= 3 ? Number((prior.reduce((s, r) => s + r.rating, 0) / prior.length).toFixed(2)) : null, valuableThreshold: 7, courtSources, verificationStatus: "pending", reasonConfirmed: false });
}
await writeFile("data/normalized/suspension-research.json", JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), method: "Last five rated league appearances before card, minimum three ratings, common valuable threshold 7/10; identity and ban service still require review", records }, null, 2) + "\n");
console.log(JSON.stringify({ candidates: records.length, withPreCardRating: records.filter((r) => r.meanRating !== null).length, valuable: records.filter((r) => r.meanRating >= 7).length, withCourtSource: records.filter((r) => r.courtSources.length).length }));
