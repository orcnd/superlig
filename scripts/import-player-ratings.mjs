import { writeFile, readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

const records = [], sources = [];
for (const [season, id] of [["2023-24", 21459], ["2024-25", 23864], ["2025-26", 27244]]) {
  const url = `https://www.fotmob.com/leagues/71/stats/season/${id}/players/rating/super-lig-players`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${season}: HTTP ${response.status}`);
  const html = await response.text(), dom = cheerio.load(html);
  const payload = JSON.parse(dom("#__NEXT_DATA__").text()).props.pageProps.data;
  if (payload.currentSeasonId !== id && Number(payload.currentSeasonId) !== id) throw new Error(`Wrong season: ${season}`);
  const rows = payload.statsData;
  if (!rows?.length) throw new Error(`Empty rating table: ${season}`);
  const retrievedAt = new Date().toISOString();
  sources.push({ season, url, retrievedAt, records: rows.length, sha256: createHash("sha256").update(html).digest("hex") });
  records.push(...rows.map((r) => ({ season, providerPlayerId: String(r.id), providerTeamId: String(r.teamId), player: r.name, rating: r.statValue.value, providerRank: r.rank, sourceUrl: url, retrievedAt, temporalScope: "season_final", eligibleForEarlierSuspensionScore: false })));
  console.log(`${season}: ${rows.length} free player ratings`);
}
await writeFile("data/raw/fotmob-player-ratings.json", JSON.stringify({ schemaVersion: 1, provider: "FotMob", scale: { min: 0, max: 10 }, limitation: "Final season averages are not pre-match ratings; do not backdate them. Provider qualification excludes unrated players.", sources, records }, null, 2) + "\n");
const manifest = JSON.parse(await readFile("data/sources-manifest.json", "utf8"));
manifest.playerRatings = sources;
manifest.generatedAt = new Date().toISOString();
await writeFile("data/sources-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
