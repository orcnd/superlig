import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

const matches = JSON.parse(await readFile("data/normalized/superlig-matches.json", "utf8")).records;
const clubs = { 8637: "3604", 8695: "3592", 9752: "3596", 1933: "3665", 4685: "39", 10188: "3590", 6265: "74", 4678: "51", 2166: "3631", 1931: "52", 4081: "3672", 1926: "3603", 9750: "3597", 10182: "72", 95749: "121", 8622: "3600", 9742: "3595", 2088: "3611", 95745: "3623", 106560: "3617", 4681: "3610", 1925: "3688", 658811: "4824", 1569: "132", 7800: "3606" };
const tasks = [], failures = [];
for (const season of ["2023-24", "2024-25", "2025-26"]) {
  const seasonName = `${season.slice(0, 4)}/${Number(season.slice(0, 4)) + 1}`;
  const url = `https://www.fotmob.com/leagues/71/overview/super-lig?season=${encodeURIComponent(seasonName)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const dom = cheerio.load(await response.text());
  const data = JSON.parse(dom("#__NEXT_DATA__").text()).props.pageProps;
  if (data.details.selectedSeason !== seasonName) throw new Error(`Wrong fixture season ${season}`);
  for (const fixture of data.fixtures.allMatches) {
    const matched = matches.filter((m) => m.season === season && m.homeTeam.tffClubId === clubs[fixture.home.id] && m.awayTeam.tffClubId === clubs[fixture.away.id]);
    if (matched.length !== 1) { failures.push({ season, providerMatchId: fixture.id, reason: "TFF match not unique" }); continue; }
    tasks.push({ fixture, match: matched[0] });
  }
}
const records = [];
let cursor = 0;
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < tasks.length) {
    const { fixture, match } = tasks[cursor++];
    const sourceUrl = `https://www.fotmob.com/api/data/matchDetails?matchId=${fixture.id}`;
    try {
      const response = await fetch(sourceUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const body = await response.text(), data = JSON.parse(body);
      if (String(data.general.matchId) !== String(fixture.id) || data.general.leagueId !== 71) throw new Error("Wrong match payload");
      const lineup = data.content?.lineup;
      const players = ["home", "away"].flatMap((side) => {
        const team = lineup?.[`${side}Team`];
        return [...(team?.starters ?? []), ...(team?.subs ?? []), ...(team?.bench ?? [])].map((p) => ({ providerPlayerId: String(p.id), player: p.name, clubId: side === "home" ? match.homeTeam.tffClubId : match.awayTeam.tffClubId, rating: typeof p.performance?.rating === "number" ? p.performance.rating : null }));
      });
      records.push({ matchId: match.matchId, season: match.season, week: match.week, providerMatchId: fixture.id, sourceUrl, pageUrl: `https://www.fotmob.com${fixture.pageUrl}`, playedAt: data.general.matchTimeUTCDate, retrievedAt: new Date().toISOString(), sha256: createHash("sha256").update(body).digest("hex"), players, events: data.content?.matchFacts?.events?.events ?? [], limitation: "Live/current unavailable-player fields deliberately excluded from historical evidence" });
    } catch (e) { failures.push({ matchId: match.matchId, sourceUrl, reason: String(e) }); }
    if (records.length && records.length % 100 === 0) console.log(`${records.length}/${tasks.length} match ratings/events`);
  }
}));
records.sort((a, b) => a.matchId.localeCompare(b.matchId));
await writeFile("data/raw/fotmob-match-evidence.json", JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), provider: "FotMob", records, failures }, null, 2) + "\n");
console.log(JSON.stringify({ matches: records.length, ratedAppearances: records.flatMap((r) => r.players).filter((p) => p.rating !== null).length, failures: failures.length }));
