import Link from "next/link";
import { importedMatches, datasetGeneratedAt } from "@/data/matches";
import { teams } from "@/data/teams";
import type { SeasonId, TeamId } from "@/schemas/domain";

const seasons: SeasonId[] = ["2023-24", "2024-25", "2025-26"];

function aggregate(teamId: TeamId, season: SeasonId) {
  const matches = importedMatches.filter((match) => match.season === season && (match.homeTeam.teamId === teamId || match.awayTeam.teamId === teamId) && match.score.home !== null && match.score.away !== null);
  return matches.reduce((result, match) => {
    const home = match.homeTeam.teamId === teamId;
    const goalsFor = home ? match.score.home! : match.score.away!;
    const goalsAgainst = home ? match.score.away! : match.score.home!;
    result.played += 1; result.gf += goalsFor; result.ga += goalsAgainst;
    if (goalsFor > goalsAgainst) result.won += 1;
    else if (goalsFor === goalsAgainst) result.drawn += 1;
    else result.lost += 1;
    return result;
  }, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0 });
}

export default function TestPage() {
  return <main><header className="site-header"><Link className="brand" href="/">← DÖRT BÜYÜKLER ENDEKSİ</Link><nav><Link href="/data">Ham veri</Link><Link href="/test">Test görünümü</Link></nav></header><article className="doc wide"><p className="eyebrow">JSON IMPORT DOĞRULAMASI</p><h1>Test veri sayfası</h1><div className="import-summary"><b>{importedMatches.length} maç başarıyla yüklendi</b><span>Kaynak: repodaki normalize JSON</span><small>{new Date(datasetGeneratedAt).toLocaleString("tr-TR")}</small></div><h2>Takım ve sezon toplamları</h2><div className="test-grid">{seasons.map((season) => <section className="test-season" key={season}><h3>{season}</h3><div className="table-scroll"><table className="explorer"><thead><tr><th>Takım</th><th>O</th><th>G</th><th>B</th><th>M</th><th>AG</th><th>YG</th></tr></thead><tbody>{teams.map((team) => { const stats = aggregate(team.id, season); return <tr key={team.id}><th><span className="mini-dot" style={{background:team.color}}/>{team.shortName}</th><td>{stats.played}</td><td>{stats.won}</td><td>{stats.drawn}</td><td>{stats.lost}</td><td>{stats.gf}</td><td>{stats.ga}</td></tr>; })}</tbody></table></div></section>)}</div><h2>İlk 20 JSON kaydı</h2><div className="table-scroll"><table className="explorer"><thead><tr><th>Sezon</th><th>H.</th><th>Ev sahibi</th><th>Skor</th><th>Deplasman</th><th>Match ID</th></tr></thead><tbody>{importedMatches.slice(0,20).map((match) => <tr key={match.matchId}><td>{match.season}</td><td>{match.week}</td><td>{match.homeTeam.sourceName}</td><td><b>{match.score.home} - {match.score.away}</b></td><td>{match.awayTeam.sourceName}</td><td>{match.matchId}</td></tr>)}</tbody></table></div><div className="notice verified-notice"><b>Kontrol sonucu:</b>&nbsp; JSON importu çalışıyor ve toplulaştırmalar dosyadaki gerçek TFF maç kayıtlarından hesaplanıyor.</div></article></main>;
}
