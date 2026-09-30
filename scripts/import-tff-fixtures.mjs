import * as cheerio from "cheerio";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const seasons = [
  { id: "2023-24", pageId: 1648 },
  { id: "2024-25", pageId: 1730 },
  { id: "2025-26", pageId: 1768 },
];
const rawDir = path.resolve("data/raw/tff");
const normalizedDir = path.resolve("data/normalized");
await mkdir(rawDir, { recursive: true });
await mkdir(normalizedDir, { recursive: true });

function idFrom(href, key) { return new URL(href, "https://www.tff.org").searchParams.get(key); }
function parseSeason(html, season, sourceUrl) {
  const $ = cheerio.load(html);
  const matches = [];
  $("table.fiksturListesiTable table.softBG").each((_, weekTable) => {
    const weekText = $(weekTable).find("td.belirginYazi").first().text().trim();
    const week = Number.parseInt(weekText, 10);
    $(weekTable).find("td[bgcolor='#FFFFFF'] > table > tbody > tr").each((__, row) => {
      const cells = $(row).children("td");
      if (cells.length !== 3) return;
      const homeLink = cells.eq(0).find("a").first();
      const scoreLink = cells.eq(1).find("a").first();
      const awayLink = cells.eq(2).find("a").first();
      const score = scoreLink.text().trim().match(/^(\d+)\s*-\s*(\d+)$/);
      const matchId = idFrom(scoreLink.attr("href") ?? "", "macId");
      if (!matchId) return;
      matches.push({
        matchId, season, week,
        homeTeam: { tffClubId: idFrom(homeLink.attr("href") ?? "", "kulupId"), sourceName: homeLink.text().trim() },
        awayTeam: { tffClubId: idFrom(awayLink.attr("href") ?? "", "kulupId"), sourceName: awayLink.text().trim() },
        score: score ? { home: Number(score[1]), away: Number(score[2]), status: "played" } : { home: null, away: null, status: "scheduled" },
        detailUrl: `https://www.tff.org/Default.aspx?pageID=29&macId=${matchId}`,
      });
    });
  });
  return { schemaVersion: 1, sourceId: `tff-fixtures-${season}`, season, retrievedAt: new Date().toISOString(), sourceUrl, sourceType: "federation", reliability: 1, dataQuality: "VERIFIED", records: [...new Map(matches.map((m) => [m.matchId, m])).values()] };
}

const allMatches = [];
const manifest = [];
for (const season of seasons) {
  const sourceUrl = `https://www.tff.org/Default.aspx?pageID=${season.pageId}`;
  const response = await fetch(sourceUrl, { headers: { "user-agent": "superlig-audit-data/1.0 (+source archive)" } });
  if (!response.ok) throw new Error(`${season.id}: TFF HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const html = new TextDecoder("windows-1254").decode(bytes);
  const parsed = parseSeason(html, season.id, sourceUrl);
  if (parsed.records.length < 100) throw new Error(`${season.id}: beklenenden az maç (${parsed.records.length})`);
  const file = `fixtures-${season.id}.json`;
  const body = JSON.stringify(parsed, null, 2) + "\n";
  await writeFile(path.join(rawDir, file), body, "utf8");
  allMatches.push(...parsed.records);
  manifest.push({ season: season.id, file: `data/raw/tff/${file}`, sourceUrl, retrievedAt: parsed.retrievedAt, records: parsed.records.length, sha256: createHash("sha256").update(body).digest("hex") });
}

const clubMap = { "3604": "gs", "3592": "fb", "3590": "bjk", "3596": "ts" };
const bigFourMatches = allMatches.filter((match) => clubMap[match.homeTeam.tffClubId] || clubMap[match.awayTeam.tffClubId]).map((match) => ({ ...match, homeTeam: { ...match.homeTeam, teamId: clubMap[match.homeTeam.tffClubId] ?? null }, awayTeam: { ...match.awayTeam, teamId: clubMap[match.awayTeam.tffClubId] ?? null }, isBigFourMatch: Boolean(clubMap[match.homeTeam.tffClubId] && clubMap[match.awayTeam.tffClubId]), verificationStatus: "verified", isMock: false }));
await writeFile(path.join(normalizedDir, "big-four-matches.json"), JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), records: bigFourMatches }, null, 2) + "\n", "utf8");
await writeFile(path.resolve("data/sources-manifest.json"), JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), sources: manifest }, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ seasons: manifest, normalizedBigFourMatches: bigFourMatches.length }, null, 2));
