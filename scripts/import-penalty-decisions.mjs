import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

// Print an apply_patch payload instead of silently overwriting repo-owned evidence.
const dataset = JSON.parse(await readFile("data/normalized/superlig-matches.json", "utf8"));
const existing = JSON.parse(await readFile("data/raw/reviewed-decisions.json", "utf8"));
const bigClubs = { "141": "3604", "36": "3592", "114": "3590", "449": "3596", "6646": "3611", "2832": "3672", "2293": "3600", "924": "3617", "3209": "3623", "11282": "51", "152": "3597", "7775": "121", "6890": "3665", "10484": "39", "868": "3595", "126": "3631", "3840": "3603", "589": "52", "3205": "72", "7160": "3610", "44006": "4824", "2381": "74", "1467": "3688", "820": "3606" };
const collected = [], sources = [], unmatched = [], reviewed = [];
const base = "https://www.transfermarkt.com";
const clubId = (href) => href?.match(/\/verein\/(\d+)/)?.[1];
async function get(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const html = await response.text();
  sources.push({ url, retrievedAt: new Date().toISOString(), sha256: createHash("sha256").update(html).digest("hex") });
  return cheerio.load(html);
}
for (const year of [2023, 2024, 2025]) {
  const season = `${year}-${String(year + 1).slice(-2)}`;
  const firstUrl = `${base}/super-lig/elfmeterstatistik/wettbewerb/TR1/saison_id/${year}/plus/`;
  const first = await get(firstUrl);
  const table = first("table.items").first();
  if (!table.length) throw new Error(`No penalty table: ${season}`);
  const pageUrls = [...new Set(table.closest(".responsive-table").nextAll().find(".tm-pagination a").map((i, e) => first(e).attr("href")).get())];
  // Pagination is associated with the first (missed) table, not the scored table.
  const pagination = table.closest(".responsive-table").parent().find(".tm-pagination").first();
  const urls = [...new Set([firstUrl, ...pagination.find("a").map((i, e) => new URL(first(e).attr("href"), base).href).get()])];
  if (pageUrls.length && urls.length === 1) throw new Error(`Pagination not found: ${season}`);
  let count = 0;
  for (const url of urls) {
    const dom = url === firstUrl ? first : await get(url);
    for (const row of dom("table.items").first().find("tbody > tr").toArray().filter((r) => dom(r).children("td").length === 8)) {
      const cells = dom(row).children("td");
      const report = cells.eq(6).find("a.ergebnis-link");
      if (!report.length) continue;
      const record = { season, week: Number(cells.eq(0).text().trim()), player: cells.eq(2).find("a[href*='/profil/spieler/']").last().text().trim(), shooterClubId: clubId(cells.eq(1).find("a").attr("href")), homeClubId: clubId(cells.eq(5).find("a").attr("href")), awayClubId: clubId(cells.eq(7).find("a").attr("href")), homeName: cells.eq(5).find("a").attr("title"), awayName: cells.eq(7).find("a").attr("title"), reportUrl: new URL(report.attr("href"), base).href, sourceUrl: url, score: report.text().trim() };
      const key = `${record.reportUrl}:${record.player}`;
      // Repeated taker in the same match can miss twice: preserve both occurrences.
      record.occurrence = collected.filter((r) => `${r.reportUrl}:${r.player}` === key).length + 1;
      collected.push(record); count++;
      const trackedHome = bigClubs[record.homeClubId], trackedAway = bigClubs[record.awayClubId];
      if (!trackedHome && !trackedAway) continue;
      const matches = dataset.records.filter((m) => m.season === season && m.week === record.week && (!trackedHome || m.homeTeam.tffClubId === trackedHome) && (!trackedAway || m.awayTeam.tffClubId === trackedAway));
      if (matches.length !== 1) { unmatched.push({ ...record, reason: "match_not_unique" }); continue; }
      const match = matches[0];
      if (record.score.replace(/\s/g, "") !== `${match.score.home}:${match.score.away}`) { unmatched.push({ ...record, reason: "score_mismatch" }); continue; }
      const reportDom = await get(record.reportUrl);
      const actions = reportDom(".sb-ereignisse .sb-aktion").filter((i, e) => reportDom(e).find(".sb-aktion-wechsel-ein").text().includes("Penalty") && reportDom(e).find(".sb-aktion-wechsel-ein a").text().trim() === record.player);
      const action = actions.eq(record.occurrence - 1);
      const style = action.find(".sb-aktion-uhr span").attr("style") ?? "";
      const coordinates = style.match(/background-position:\s*(-?\d+)px\s+(-?\d+)px/);
      const minute = coordinates ? Math.abs(Number(coordinates[2])) / 36 * 10 + Math.abs(Number(coordinates[1])) / 36 + 1 : null;
      if (!action.length || !Number.isInteger(minute) || minute < 1 || minute > 130) { unmatched.push({ ...record, reason: "minute_not_parsed" }); continue; }
      const shootingClub = record.shooterClubId === record.homeClubId ? match.homeTeam : match.awayTeam;
      const outcome = action.find(".sb-aktion-wechsel-aus").text().includes("Saved") ? "saved" : "missed";
      reviewed.push({ id: `TM-${report.attr("id")}-MISSED-${minute}-${record.occurrence}`, matchId: match.matchId, benefitingClubId: shootingClub.tffClubId, player: record.player, minute, outcome, sourceUrls: [record.reportUrl, url, match.detailUrl] });
    }
  }
  console.error(`${season}: ${count} missed penalties across ${urls.length} pages`);
}
// The scored decision exists regardless of future coverage; TFF is direct evidence.
const scored = dataset.records.flatMap((match) => (match.details?.goals ?? []).filter((g) => g.type === "penalty" && g.tffClubId && g.minute !== null).map((goal, i) => ({ id: `TFF-${match.matchId}-PENALTY-${i}`, matchId: match.matchId, benefitingClubId: goal.tffClubId, player: goal.player, minute: goal.minute, outcome: "scored", sourceUrls: [match.detailUrl] })));
const manual = existing.penalties.filter((p) => !p.id.startsWith("TFF-") && !p.id.startsWith("TM-"));
const decisions = { ...existing, penalties: [...manual, ...scored, ...reviewed] };
const raw = { schemaVersion: 1, generatedAt: new Date().toISOString(), provider: "Transfermarkt missed penalties + TFF scored penalties", sources, records: collected, matched: reviewed.length, unmatched, scope: "All league clubs normalized by explicit provider/TFF club identity map" };
function operation(path, value, old) {
  const lines = JSON.stringify(value, null, 2).split("\n");
  if (!old) return `*** Add File: ${path}\n${lines.map((l) => "+" + l).join("\n")}`;
  const before = old.trimEnd().split(/\r?\n/);
  let start = 0, end = 0;
  while (start < Math.min(before.length, lines.length) && before[start] === lines[start]) start++;
  while (end < Math.min(before.length, lines.length) - start && before[before.length - end - 1] === lines[lines.length - end - 1]) end++;
  const context = before.slice(Math.max(0, start - 3), start).map((l) => " " + l);
  return `*** Update File: ${path}\n@@\n${[...context, ...before.slice(start, before.length - end).map((l) => "-" + l), ...lines.slice(start, lines.length - end).map((l) => "+" + l), ...before.slice(before.length - end, before.length - end + 3).map((l) => " " + l)].join("\n")}`;
}
const priorRaw = await readFile("data/raw/transfermarkt-missed-penalties.json", "utf8").catch(() => null);
if (process.argv.includes("--write")) {
  await writeFile("data/raw/transfermarkt-missed-penalties.json", JSON.stringify(raw, null, 2) + "\n");
  await writeFile("data/raw/reviewed-decisions.json", JSON.stringify(decisions, null, 2) + "\n");
} else if (process.argv.includes("--json")) console.log(JSON.stringify({ raw, decisions }));
else console.log(`*** Begin Patch\n${operation("data/raw/transfermarkt-missed-penalties.json", raw, priorRaw)}\n${operation("data/raw/reviewed-decisions.json", decisions, await readFile("data/raw/reviewed-decisions.json", "utf8"))}\n*** End Patch`);
console.error(JSON.stringify({ scored: scored.length, missed: reviewed.length, unmatched: unmatched.length }));
if (unmatched.length) process.exitCode = 2;
