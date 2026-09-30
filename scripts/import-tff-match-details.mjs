import * as cheerio from "cheerio";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";

const normalizedFile = path.resolve("data/normalized/big-four-matches.json");
const dataset = JSON.parse(await readFile(normalizedFile, "utf8"));
const rawDir = path.resolve("data/raw/tff");
await mkdir(rawDir, { recursive: true });

const decode = async (response) => new TextDecoder("windows-1254").decode(Buffer.from(await response.arrayBuffer()));
const param = (href, key) => new URL(href, "https://www.tff.org").searchParams.get(key);
const cleanRole = (text) => text.match(/\(([^)]+)\)\s*$/)?.[1] ?? "UNKNOWN";
const cleanName = (text) => text.replace(/\([^)]+\)\s*$/, "").trim();

function parseDetail(html, match) {
  const $ = cheerio.load(html);
  const dateText = $("[id$='lblTarih']").first().text().trim();
  const officials = $("a[id$='lnkHakem']").map((_, el) => ({ tffPersonId: param($(el).attr("href") ?? "", "hakemId"), name: cleanName($(el).text()), role: cleanRole($(el).text()) })).get();
  const cards = $("img[alt='Sarı Kart'], img[alt='Çift Sarı Kart'], img[alt='Kırmızı Kart']").map((_, image) => {
    const id = $(image).attr("id") ?? "";
    const cell = $(image).closest("td");
    const player = cell.find("a[href*='kisiId']").first();
    const minuteText = cell.find("span").last().text().trim();
    const side = id.includes("grdTakim1") ? "home" : id.includes("grdTakim2") ? "away" : "unknown";
    return { teamId: side === "home" ? match.homeTeam.teamId : side === "away" ? match.awayTeam.teamId : null, tffClubId: side === "home" ? match.homeTeam.tffClubId : side === "away" ? match.awayTeam.tffClubId : null, side, player: player.text().trim(), tffPersonId: param(player.attr("href") ?? "", "kisiId"), type: $(image).attr("alt") === "Sarı Kart" ? "yellow" : $(image).attr("alt") === "Çift Sarı Kart" ? "second_yellow" : "red", minute: Number.parseInt(minuteText, 10) || null, sourceText: minuteText };
  }).get();
  const goals = $("a[id$='_lblGol']").map((_, link) => {
    const id = $(link).attr("id") ?? "";
    const text = $(link).text().trim();
    const side = id.includes("grdTakim1") ? "home" : id.includes("grdTakim2") ? "away" : "unknown";
    const minuteText = text.match(/,(\d+(?:\+\d+)?)\.dk/)?.[1] ?? "";
    return {
      teamId: side === "home" ? match.homeTeam.teamId : side === "away" ? match.awayTeam.teamId : null,
      tffClubId: side === "home" ? match.homeTeam.tffClubId : side === "away" ? match.awayTeam.tffClubId : null,
      side,
      player: $(link).text().split(",")[0].trim(),
      tffPersonId: param($(link).attr("href") ?? "", "kisiId"),
      type: /\(P\)\s*$/.test(text) ? "penalty" : /\(K\)\s*$/.test(text) ? "own_goal" : "open_play",
      minute: Number.parseInt(minuteText, 10) || null,
      sourceText: text,
    };
  }).get();
  const squad = (side) => ({
    starters: $(`a[id*='grdTakim${side}'][id*='rptKadrolar'][href*='kisiId']`).map((_, link) => ({ tffPersonId: param($(link).attr("href") ?? "", "kisiId"), name: $(link).text().trim() })).get(),
    bench: $(`a[id*='grdTakim${side}'][id*='rptYedekler'][href*='kisiId']`).map((_, link) => ({ tffPersonId: param($(link).attr("href") ?? "", "kisiId"), name: $(link).text().trim() })).get(),
  });
  return { matchId: match.matchId, season: match.season, sourceUrl: match.detailUrl, retrievedAt: new Date().toISOString(), dateText, officials, cards, goals, lineups: { home: squad(1), away: squad(2) }, quality: "VERIFIED", verificationStatus: "verified", isMock: false };
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length); let cursor = 0;
  async function run() { while (cursor < items.length) { const index = cursor++; results[index] = await worker(items[index], index); } }
  await Promise.all(Array.from({ length: limit }, run)); return results;
}

const details = await mapLimit(dataset.records, 10, async (match, index) => {
  const response = await fetch(match.detailUrl, { headers: { "user-agent": "superlig-audit-data/1.0 (+source archive)" } });
  if (!response.ok) throw new Error(`${match.matchId}: HTTP ${response.status}`);
  const detail = parseDetail(await decode(response), match);
  if (!detail.dateText) throw new Error(`${match.matchId}: tarih ayrıştırılamadı`);
  if ((index + 1) % 50 === 0) console.log(`${index + 1}/${dataset.records.length}`);
  return detail;
});

const detailManifest = [];
for (const season of ["2023-24", "2024-25", "2025-26"]) {
  const records = details.filter((detail) => detail.season === season);
  const file = `match-details-${season}.json`;
  const body = JSON.stringify({ schemaVersion: 1, season, sourceType: "federation", reliability: 1, records }, null, 2) + "\n";
  await writeFile(path.join(rawDir, file), body, "utf8");
  detailManifest.push({ season, file: `data/raw/tff/${file}`, source: "TFF match detail pages", records: records.length, cardEvents: records.reduce((sum, record) => sum + record.cards.length, 0), goalEvents: records.reduce((sum, record) => sum + record.goals.length, 0), penaltyGoals: records.reduce((sum, record) => sum + record.goals.filter((goal) => goal.type === "penalty").length, 0), lineupPlayers: records.reduce((sum, record) => sum + record.lineups.home.starters.length + record.lineups.home.bench.length + record.lineups.away.starters.length + record.lineups.away.bench.length, 0), sha256: createHash("sha256").update(body).digest("hex") });
}
const byId = new Map(details.map((detail) => [detail.matchId, detail]));
dataset.generatedAt = new Date().toISOString();
dataset.records = dataset.records.map((match) => ({ ...match, details: byId.get(match.matchId) }));
await writeFile(normalizedFile, JSON.stringify(dataset, null, 2) + "\n", "utf8");
const manifestFile = path.resolve("data/sources-manifest.json");
const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
manifest.matchDetails = detailManifest;
manifest.generatedAt = new Date().toISOString();
await writeFile(manifestFile, JSON.stringify(manifest, null, 2) + "\n", "utf8");
console.log(JSON.stringify({ matches: details.length, cards: details.reduce((sum, detail) => sum + detail.cards.length, 0), goals: details.reduce((sum, detail) => sum + detail.goals.length, 0), penaltyGoals: details.reduce((sum, detail) => sum + detail.goals.filter((goal) => goal.type === "penalty").length, 0), lineupPlayers: details.reduce((sum, detail) => sum + detail.lineups.home.starters.length + detail.lineups.home.bench.length + detail.lineups.away.starters.length + detail.lineups.away.bench.length, 0), referees: new Set(details.flatMap((detail) => detail.officials.filter((official) => official.role === "Hakem").map((official) => official.tffPersonId))).size }, null, 2));
