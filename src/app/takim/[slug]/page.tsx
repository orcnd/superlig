import Image from "next/image";
import { Fragment } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ledgerEvents } from "@/data/ledger";
import { importedMatches } from "@/data/matches";
import { teams } from "@/data/teams";
import { isScorableEvent, scoreContributions } from "@/scoring/engine";
import { formatScore } from "@/scoring/presentation";
import type { Category, SeasonId } from "@/schemas/domain";

const seasons: SeasonId[] = ["2023-24", "2024-25", "2025-26"];
const signed = (contribution: ReturnType<typeof scoreContributions>[number]) => contribution.direction === "disadvantage" ? -contribution.amount : contribution.amount;
const value = formatScore;
const categoryLabels: Record<Category, string> = { DISCIPLINE: "Kart", CRITICAL_SUSPENSION: "Kritik ceza", PENALTIES: "Penaltı", VAR: "VAR", SCHEDULE: "Fikstür", OPPONENT_AVAILABILITY: "Rakip eksikliği", OPPONENT_STRENGTH: "Rakip gücü", OTHER: "Diğer" };
function contributionLog(teamName: string, contribution: ReturnType<typeof scoreContributions>[number]) {
  const effect = value(signed(contribution)); const category = categoryLabels[contribution.category];
  if (contribution.direction === "disadvantage") return `Dezavantaj · ${category}: ${contribution.explanation}. ${teamName} için net etki ${effect}.`;
  if (contribution.kind === "indirect") return `Dolaylı avantaj · ${category}: ${contribution.explanation}. Rakipteki bu durum ${teamName} için net ${effect} katkı oluşturdu.`;
  return `Doğrudan avantaj · ${category}: ${contribution.explanation}. ${teamName} için net etki ${effect}.`;
}

export const dynamicParams = false;
export function generateStaticParams() { return teams.map((team) => ({ slug: team.slug })); }

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const team = teams.find((item) => item.slug === slug);
  if (!team) notFound();
  return <main>
    <header className="site-header"><Link className="brand" href="/">← DÖRT BÜYÜKLER ENDEKSİ</Link><nav><Link href="/">Genel puan özeti</Link><Link href="/data">Veri gezgini</Link><Link href="/sources">Kaynaklar</Link></nav></header>
    <section className="hero audit-hero compact-team-hero"><p className="eyebrow">TAKIM DOSYASI · HAFTA HAFTA BİLANÇO</p><div className="team-page-title"><Image src={team.logoUrl} alt={`${team.name} logosu`} width={86} height={86}/><div><h1>{team.name}</h1><p>Yalnızca puana katkısı doğrulanmış maçlar gösterilir. Artı değer avantaj, eksi değer dezavantajdır.</p></div></div></section>
    <section className="section"><div className="notice"><div><b>Haftalık hesap yöntemi</b><p>Verilen penaltılar ve önemli oyuncuların kart cezası yüzünden oynayamadığı maçlar hesaba katılır. Rakibin önemli cezalı oyuncusunun olmaması avantaj; kendi önemli oyuncusunun önemli maçta cezalı olması dezavantajdır. Her kart ya da oyuncunun kadroda olmaması puan getirmez. Maç sonucu ve sakatlıklar da hesapta yoktur. İncelemesi tamamlanmamış olaylar ve boş maç satırları gösterilmez. Görünmeyen bir hafta, o maçta hiç etki yaşanmadığı anlamına gelmez.</p></div></div>{seasons.map((season) => { const matches = importedMatches.filter((match) => match.season === season && (match.homeTeam.teamId === team.id || match.awayTeam.teamId === team.id)).filter((match) => ledgerEvents.some((event) => event.matchId === match.matchId && isScorableEvent(event) && event.effects.some((effect) => effect.teamId === team.id))).sort((a, b) => a.week - b.week); if (!matches.length) return null; return <article key={season} className="team-season"><div className="section-heading"><div><p className="eyebrow">{season} SEZONU</p><h2>Hafta hafta avantaj bilançosu</h2></div><span className="verified-pill">{matches.length} PUANLANAN MAÇ</span></div><div className="table-scroll"><table className="summary-table weekly-ledger"><thead><tr><th>Hafta</th><th>Maç</th><th>Avantaj</th><th>Dezavantaj</th><th>Net</th><th>Kaynak</th></tr></thead><tbody>{matches.map((match) => { const events = ledgerEvents.filter((event) => event.season === season && event.matchId === match.matchId); const contributions = scoreContributions(events, team.id, "general"); const advantage = contributions.filter((c) => c.direction === "advantage").reduce((sum, c) => sum + c.amount, 0); const disadvantage = contributions.filter((c) => c.direction === "disadvantage").reduce((sum, c) => sum + c.amount, 0); const net = advantage - disadvantage; return <Fragment key={match.matchId}><tr><td>{match.week}</td><td>{match.homeTeam.sourceName} – {match.awayTeam.sourceName}</td><td className="positive">{value(advantage)}</td><td className="negative">{value(-disadvantage)}</td><td><strong className={net >= 0 ? "positive" : "negative"}>{contributions.length ? value(net) : "—"}</strong></td><td><a href={match.detailUrl} target="_blank" rel="noreferrer">TFF maç detayı ↗</a></td></tr><tr key={`${match.matchId}-log`} className="weekly-log-row"><td colSpan={6}><details><summary>Hafta {match.week} olay günlüğü · {contributions.length ? `${contributions.length} puan katkısı` : "endekse giren doğrulanmış olay yok"}</summary>{contributions.length ? <ul>{contributions.map((contribution) => <li key={`${contribution.eventId}-${contribution.category}`}>{contributionLog(team.name, contribution)} {contribution.sourceUrl && <a href={contribution.sourceUrl} target="_blank" rel="noreferrer">Kaynak ↗</a>}</li>)}</ul> : <p>Bu maç için henüz hesaba katılan bir olay yok. Bu ifade, maçta tartışmalı karar ya da ceza etkisi yaşanmadığını kanıtlamaz.</p>}</details></td></tr></Fragment>; })}</tbody></table></div></article>; })}</section>
    <section className="section"><p className="eyebrow">DİĞER TAKIM DOSYALARI</p><div className="source-grid">{teams.filter((item) => item.id !== team.id).map((item) => <Link key={item.id} className="source-card" href={`/takim/${item.slug}`}><b>{item.name}</b><span>Hafta hafta avantaj bilançosunu aç →</span></Link>)}</div></section>
  </main>;
}
