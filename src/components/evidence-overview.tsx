import Link from "next/link";
import Image from "next/image";
import { teams } from "@/data/teams";
import { importedMatches } from "@/data/matches";
import { evidenceSummary } from "@/data/evidence-summary";

export function EvidenceOverview() {
  return <section className="section" id="gozlenen-veriler">
    <div className="section-heading"><div><p className="eyebrow">YÜKLENEN GERÇEK VERİLER</p><h2>Üç sezonun kayıt özeti</h2></div><Link className="outline" href="/data">Tüm ham kayıtlar →</Link></div>
    <p className="section-intro">{importedMatches.length.toLocaleString("tr-TR")} maçın kaydı bulunuyor. Bu tablo puan değil, olay sayısını gösterir. Penaltı sütunlarında yalnızca gol olan penaltılar var; kaçan penaltılar puan hesabında ayrıca yer alır. “İncelenecek eksik” sayıları henüz ceza olduğu doğrulanmamış oyuncu yokluklarıdır.</p>
    {(["2023-24", "2024-25", "2025-26"] as const).map((season) => <article className="panel" key={season} style={{ marginTop: 20 }}><h3>{season}</h3><div className="table-scroll"><table className="summary-table"><thead><tr><th>Takım</th><th>Maç</th><th>Sarı kart</th><th>İhraç</th><th>Lehine penaltı golü</th><th>Aleyhine penaltı golü</th><th>İncelenecek kendi eksikleri</th><th>İncelenecek rakip eksikleri</th><th>Hesaba katılan olay</th></tr></thead><tbody>{teams.map((team) => {
      const data = evidenceSummary(team.id, season);
      return <tr key={team.id}><th><Link className="team-name" href={`/takim/${team.slug}`}><Image src={team.logoUrl} alt={`${team.name} logosu`} width={34} height={34}/><b>{team.name}</b></Link></th><td>{data.matches}</td><td>{data.yellow}</td><td>{data.red}</td><td>{data.penaltyFor}</td><td>{data.penaltyAgainst}</td><td><Link href={`/data?category=Kritik%20cezalar&team=${team.id}&season=${season}`}>{data.ownAbsenceCandidates} incelenecek ↗</Link></td><td><Link href={`/takim/${team.slug}`}>{data.opponentAbsenceCandidates} incelenecek ↗</Link></td><td>{data.scored} doğrulanmış</td></tr>;
    })}</tbody></table></div></article>)}
  </section>;
}
