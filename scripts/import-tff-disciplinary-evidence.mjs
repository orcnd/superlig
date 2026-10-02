import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import * as cheerio from "cheerio";

const matches = JSON.parse(await readFile("data/normalized/superlig-matches.json", "utf8")).records;
const time = (text) => { const p = text?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/); return p ? Date.UTC(+p[3], +p[2] - 1, +p[1]) : null; };
const origins = matches.flatMap((m) => (m.details?.cards ?? []).filter((c) => c.type === "red" || c.type === "second_yellow").map((c) => ({ ...c, originMatchId: m.matchId, season: m.season, date: time(m.details.dateText) })));
const docs = new Map(), archive = [], failures = [];
async function page(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status}: ${url}`);
  const html = new TextDecoder("windows-1254").decode(await r.arrayBuffer());
  return { dom: cheerio.load(html), sha256: createHash("sha256").update(html).digest("hex") };
}
for (let n = 1; n <= 7; n++) {
  const url = `https://www.tff.org/Default.aspx?1082pg=${n}&pageID=238`;
  const { dom } = await page(url);
  for (const a of dom("a[href*='ftxtID']").toArray()) {
    const title = dom(a).text().trim(), date = time(title);
    if (!title.startsWith("PFDK Karar") || !date || date < Date.UTC(2023, 7, 1) || date > Date.UTC(2026, 5, 30)) continue;
    if (!origins.some((o) => o.date && date >= o.date && date - o.date <= 12 * 86400000)) continue;
    docs.set(new URL(dom(a).attr("href"), "https://www.tff.org").href, { title, date });
  }
}
let cursor = 0;
const tasks = [...docs];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (cursor < tasks.length) {
    const [url, meta] = tasks[cursor++];
    try {
      const { dom, sha256 } = await page(url);
      const text = dom("body").text().replace(/\s+/g, " ");
      const evidence = origins.filter((o) => o.date && meta.date >= o.date && meta.date - o.date <= 12 * 86400000 && o.player && text.includes(o.player)).map((o) => {
        const start = text.indexOf(o.player), excerpt = text.slice(Math.max(0, start - 100), start + 900);
        return { originMatchId: o.originMatchId, season: o.season, playerId: o.tffPersonId, clubId: o.tffClubId, player: o.player, cardType: o.type, excerpt, verificationStatus: "pending", limitation: "Matched name in official decision; appeal, service match and pre-match player rating require separate confirmation" };
      });
      archive.push({ sourceUrl: url, title: meta.title, retrievedAt: new Date().toISOString(), sha256, matches: evidence });
    } catch (e) { failures.push({ url, error: String(e) }); }
    if (archive.length % 20 === 0) console.log(`${archive.length}/${tasks.length} disciplinary documents`);
  }
}));
archive.sort((a, b) => a.sourceUrl.localeCompare(b.sourceUrl));
await writeFile("data/raw/tff-disciplinary-evidence.json", JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), sources: archive, failures, limitation: "Search covers dismissal cards; yellow accumulation, appeals and ban-service matches are not automatically verified." }, null, 2) + "\n");
console.log(JSON.stringify({ documents: archive.length, matchedPlayerDecisions: archive.reduce((s, d) => s + d.matches.length, 0), failures: failures.length }));
