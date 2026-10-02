import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
const files = ["data/raw/reviewed-decisions.json", "data/raw/transfermarkt-missed-penalties.json", "data/raw/fotmob-player-ratings.json", "data/raw/fotmob-match-evidence.json", "data/raw/tff-disciplinary-evidence.json", "data/normalized/suspension-research.json"];
const payloads = new Map(), sources = [];
for (const file of files) {
  const body = await readFile(file, "utf8"), data = JSON.parse(body);
  payloads.set(file, data);
  sources.push({ file, retrievedAt: new Date().toISOString(), sha256: createHash("sha256").update(body).digest("hex"), records: data.records?.length ?? data.sources?.length ?? data.penalties.length + data.suspensions.length });
}
const provider = payloads.get("data/raw/fotmob-match-evidence.json");
const court = payloads.get("data/raw/tff-disciplinary-evidence.json");
const ratings = payloads.get("data/raw/fotmob-player-ratings.json");
const penalties = payloads.get("data/raw/reviewed-decisions.json");
const research = payloads.get("data/normalized/suspension-research.json");
const catalog = {
  generatedAt: new Date().toISOString(),
  counts: { penalties: penalties.penalties.length, missedPenalties: penalties.penalties.filter((p) => p.outcome !== "scored").length, reviewedSuspensions: penalties.suspensions.length, matchRatings: provider.records.length, ratedAppearances: provider.records.flatMap((r) => r.players).filter((p) => p.rating !== null).length, seasonRatings: ratings.records.length, courtDocuments: court.sources.length, researchCandidates: research.records.length, researchWithRating: research.records.filter((r) => r.meanRating !== null).length },
  matchSources: provider.records.map((r) => ({ matchId: r.matchId, season: r.season, url: r.sourceUrl, pageUrl: r.pageUrl })),
  courtSources: court.sources.map((r) => ({ title: r.title, url: r.sourceUrl, matchedPlayers: r.matches.length })),
  ratingSources: ratings.sources.map((r) => ({ season: r.season, url: r.url, records: r.records })),
  files: sources,
  limitations: ["Ceza araştırma adaylarının tamamının infaz ve itiraz sonucu doğrulanmadı.", "VAR karar envanteri yok; görevlendirme bilgisi karar kaydı değildir.", "Sezon sonu oyuncu puanları geçmişteki cezalara uygulanmaz."],
};
await writeFile("data/normalized/evidence-sources.json", JSON.stringify(catalog, null, 2) + "\n");
const manifest = JSON.parse(await readFile("data/sources-manifest.json", "utf8"));
manifest.decisionEvidence = sources; manifest.generatedAt = catalog.generatedAt;
await writeFile("data/sources-manifest.json", JSON.stringify(manifest, null, 2) + "\n");
console.log(catalog.counts);
