"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { ChevronDown, Scale, ShieldCheck, SlidersHorizontal, Trophy, Sparkles, Pause } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import evidenceCatalog from "../../data/normalized/evidence-sources.json";
import { ledgerEvents } from "@/data/ledger";
import { teams } from "@/data/teams";
import { isScorableEvent, scoreContributions, scoreEvents } from "@/scoring/engine";
import type { ScoreContribution } from "@/scoring/engine";
import { formatScore } from "@/scoring/presentation";
import { CARD_SUSPENSION_DISADVANTAGE_MULTIPLIER, OPPONENT_ABSENCE_ADVANTAGE_MULTIPLIER, PENALTY_ADVANTAGE_MULTIPLIER } from "@/config/scoring";
import type { Category, SeasonId, Team } from "@/schemas/domain";

const verifiedEvents = ledgerEvents.filter(isScorableEvent);
const motionQuery = "(prefers-reduced-motion: reduce)";
function subscribeReducedMotion(listener: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}
const reducedMotionSnapshot = () => window.matchMedia(motionQuery).matches;
const serverMotionSnapshot = () => true;
const seasons: SeasonId[] = ["2023-24", "2024-25", "2025-26"];

const value = formatScore;
const TeamName = ({ team }: { team: Team }) => <Link href={`/takim/${team.slug}`} className="team-name"><Image src={team.logoUrl} alt={`${team.name} logosu`} width={34} height={34}/><b>{team.name}</b></Link>;
const contributionGroups: Array<{ label: string; categories: Category[] }> = [
  { label: "Penaltı", categories: ["PENALTIES"] }, { label: "Kart-ceza", categories: ["CRITICAL_SUSPENSION"] }, { label: "Rakip eksikleri", categories: ["OPPONENT_AVAILABILITY"] }, { label: "VAR kararları", categories: ["VAR"] },
];
const pieCategoryMeta: Partial<Record<Category, { label: string; color: string }>> = {
  VAR: { label: "VAR kararları", color: "#8855aa" },
  PENALTIES: { label: "Penaltı", color: "#2e77bd" },
  CRITICAL_SUSPENSION: { label: "Kart-ceza", color: "#c4495b" },
  OPPONENT_AVAILABILITY: { label: "Rakip eksikliği", color: "#16865e" },
};
const signedContribution = (contribution: ScoreContribution) => contribution.direction === "disadvantage" ? -contribution.amount : contribution.amount;
function pieData(contributions: ScoreContribution[], direction: "advantage" | "disadvantage") {
  return contributionGroups.map((group) => {
    const category = group.categories[0];
    const amount = contributions.filter((contribution) => contribution.direction === direction && contribution.category === category).reduce((sum, contribution) => sum + contribution.amount, 0);
    return { name: pieCategoryMeta[category]?.label ?? group.label, value: Number(amount.toFixed(3)), color: pieCategoryMeta[category]?.color ?? "#718095" };
  }).filter((item) => item.value > 0);
}
function DecisionPie({ title, data, animate }: { title: string; data: ReturnType<typeof pieData>; animate: boolean }) {
  if (!data.length) return null;
  return <div className="decision-pie"><h4>{title}</h4><div className="decision-pie-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" innerRadius={25} outerRadius={38} paddingAngle={2} isAnimationActive={animate} animationDuration={850} animationEasing="ease-out">{data.map((item) => <Cell key={item.name} fill={item.color}/>)}</Pie><Tooltip formatter={(amount) => Number(amount ?? 0).toFixed(2).replace(".", ",")}/></PieChart></ResponsiveContainer></div><ul>{data.map((item) => <li key={item.name}><span style={{ background: item.color }}/>{item.name}<b>{item.value.toFixed(2).replace(".", ",")}</b></li>)}</ul></div>;
}

export function Dashboard() {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, reducedMotionSnapshot, serverMotionSnapshot);
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  // Respect the device preference by default; an explicit click can opt in.
  const motionAllowed = motionOverride ?? !reducedMotion;
  const adjusted = true;
  const [formulaOpen, setFormulaOpen] = useState(false);

  const seasonScores = useMemo(() => new Map(seasons.map((season) => [season, scoreEvents(verifiedEvents.filter((event) => event.season === season), "general", adjusted)])), [adjusted]);
  const seasonContributions = useMemo(() => new Map(seasons.map((season) => [season, new Map(teams.map((team) => [team.id, scoreContributions(verifiedEvents.filter((event) => event.season === season), team.id, "general", adjusted)]))])), [adjusted]);
  const ranking = useMemo(() => scoreEvents(verifiedEvents, "general", adjusted).sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity)), [adjusted]);
  const pieCharts = useMemo(() => teams.map((team) => { const contributions = scoreContributions(verifiedEvents, team.id, "general", adjusted); return { team, advantage: pieData(contributions, "advantage"), disadvantage: pieData(contributions, "disadvantage") }; }).filter((item) => item.advantage.length || item.disadvantage.length), [adjusted]);
  return <main className="compact-dashboard playful-dashboard" data-motion={motionAllowed ? "on" : "off"}>
    <header className="site-header"><Link className="brand" href="/"><Scale size={19}/> DÖRT BÜYÜKLER ENDEKSİ</Link><nav><a href="#siralama">Puan özeti</a><a href="#uc-sezon">Sezonlar</a><a href="#grafikler">Grafikler</a><Link href="/data">Veri gezgini</Link><Link href="/sources">Kaynaklar</Link><a href="#formul">Formül</a></nav></header>
    <section className="hero audit-hero"><p className="eyebrow hero-label"><Sparkles size={13}/> ÜÇ SEZON · DÖRT TAKIM</p><h1>Avantaj / <em>Dezavantaj Endeksi</em></h1><p>Lehine ve aleyhine verilen penaltılar ile önemli oyuncuların kart cezası yüzünden önemli maçlarda oynayamamasının etkisini karşılaştırıyoruz. Rakibin önemli cezalı oyuncusu olmadan gelmesi avantaj, kendi oyuncusunun cezalı olması dezavantajdır. Normal kartlar, sakatlıklar ve maç kazanmak puan getirmez.</p><div className="principle"><ShieldCheck size={19}/><span><b>Önce veri.</b> Yalnızca doğrulanmış olaylar gösterilir. Puanlar hakem hatası, taraflılık veya kesin sıralama ölçümü değildir.</span></div><div className="compact-stats"><span><b>{evidenceCatalog.counts.penalties}</b> lig penaltı kararı</span><span><b>{evidenceCatalog.counts.missedPenalties}</b> kaçan / kurtarılan</span><span><b>{evidenceCatalog.counts.reviewedSuspensions}</b> doğrulanmış ceza olayı</span><Link href="/sources">Kaynakları incele ↗</Link><button className="motion-toggle" aria-label="Animasyonlar" aria-pressed={motionAllowed} title={reducedMotion && motionOverride === null ? "Hareket azaltma tercihiniz uygulanıyor; isterseniz animasyonları açabilirsiniz" : "Animasyonları aç veya kapat"} onClick={() => setMotionOverride(!motionAllowed)}>{motionAllowed ? <Sparkles size={13}/> : <Pause size={13}/>} {motionAllowed ? "Hareket açık" : "Sakin görünüm"}</button></div></section>
    <section id="siralama" className="section ranking-section"><div className="section-heading"><div><p className="eyebrow">DOĞRULANMIŞ OLAYLARA GÖRE</p><h2>Üç sezonun puan özeti</h2></div></div><p className="mobile-table-hint">Tüm sezonları görmek için tabloyu yana kaydırın →</p><div className="table-scroll"><table className="summary-table ranking-table"><thead><tr><th>Takım</th>{seasons.map((season) => <th key={season}>{season}</th>)}<th>Avantaj</th><th>Dezavantaj</th><th>Net</th></tr></thead><tbody>{ranking.map((score) => { const team = teams.find((item) => item.id === score.teamId)!; return <tr key={team.id}><th><TeamName team={team}/></th>{seasons.map((season) => <td key={season}>{value(seasonScores.get(season)?.find((item) => item.teamId === team.id)?.net ?? null)}</td>)}<td className="positive">{value((score.direct ?? 0) + (score.indirect ?? 0))}</td><td className="negative">{score.disadvantage === null ? "—" : value(-score.disadvantage)}</td><td><strong className={score.net !== null && score.net >= 0 ? "positive" : "negative"}>{value(score.net)}</strong></td></tr>; })}</tbody></table></div><p className="subtle"><Trophy size={14}/> Avantaj − dezavantaj = net puan. Takım adına tıklayarak olayları inceleyebilirsiniz. Ceza araştırması tamamlanmadı; VAR kararları hesaba dahil değil.</p></section>
    <section id="uc-sezon" className="section"><div className="section-heading"><div><p className="eyebrow">ÜÇ SEZON YAN YANA</p><h2>Sezonun puan gerekçeleri</h2></div><Link className="outline" href="/data?category=Endeks%20olaylar%C4%B1">Tüm olaylar ↗</Link></div><div className="compact-season-grid">{seasons.map((season) => {
      const rows = teams.map((team) => ({ team, contributions: seasonContributions.get(season)?.get(team.id) ?? [] })).filter((row) => row.contributions.length);
      if (!rows.length) return null;
      const reasons = rows.flatMap(({ team, contributions }) => contributions.map((contribution) => ({ team, contribution }))).sort((a, b) => b.contribution.amount - a.contribution.amount).slice(0, 6);
      return <article className="panel compact-season" key={season}><h3>{season}</h3><table className="summary-table"><thead><tr><th>Takım</th><th>Lehine</th><th>Aleyhine</th><th>Net</th></tr></thead><tbody>{rows.map(({ team, contributions }) => {
        const advantage = contributions.filter((c) => c.direction === "advantage").reduce((sum, c) => sum + c.amount, 0);
        const disadvantage = contributions.filter((c) => c.direction === "disadvantage").reduce((sum, c) => sum + c.amount, 0);
        return <tr key={team.id}><th><Link className="compact-team" href={`/takim/${team.slug}`}><Image src={team.logoUrl} alt={`${team.name} logosu`} width={22} height={22}/>{team.shortName}</Link></th><td className="positive">{advantage.toFixed(2).replace(".", ",")}</td><td className="negative">{disadvantage.toFixed(2).replace(".", ",")}</td><td><b>{value(advantage - disadvantage)}</b></td></tr>;
      })}</tbody></table><details><summary>Öne çıkan olaylar <ChevronDown size={13}/></summary><ul className="compact-reasons">{reasons.map(({ team, contribution }) => <li key={`${team.id}-${contribution.eventId}-${contribution.category}`}><div><b>{team.shortName}</b><strong className={signedContribution(contribution) >= 0 ? "positive" : "negative"}>{value(signedContribution(contribution))}</strong></div><p>{contribution.explanation}</p><a href={contribution.sourceUrl} target="_blank" rel="noreferrer">{contribution.matchLabel} ↗</a></li>)}</ul></details></article>;
    })}</div></section>
    <section id="grafikler" className="section decision-pies"><div className="section-heading"><div><p className="eyebrow">KARAR ETKİSİ DAĞILIMI</p><h2>Takım bazında dağılım</h2></div></div><p className="section-intro">Üç sezonun toplam puanı. Grafiklerde yalnızca hesaba katılan olaylar yer alır.</p><div className="decision-pie-grid">{pieCharts.map(({ team, advantage, disadvantage }) => <article className="panel decision-pie-team" style={{ "--team-accent": team.color } as CSSProperties} key={team.id}><TeamName team={team}/><div className="decision-pie-pair"><DecisionPie title={"Avantaj"} data={advantage} animate={motionAllowed}/><DecisionPie title={"Dezavantaj"} data={disadvantage} animate={motionAllowed}/></div></article>)}</div></section>
    <section id="formul" className="formula-band"><div className="formula-head"><div><p className="eyebrow">HESAPLAMANIN AYRINTILARI</p><h2>Puanlar nasıl hesaplanıyor?</h2></div><button className="outline light" aria-expanded={formulaOpen} aria-controls="formula-details" onClick={() => setFormulaOpen(!formulaOpen)}><SlidersHorizontal size={15}/> Formülü {formulaOpen ? "gizle" : "göster"}</button></div>{formulaOpen && <div id="formula-details" className="formula-detail"><p><b>Net puan = lehine etkiler + rakip eksikliği − aleyhine etkiler.</b></p><p>Penaltılar: lehe katkı ×{PENALTY_ADVANTAGE_MULTIPLIER}; aleyhe katkı azaltılmaz. Gol olup olmaması puanı değiştirmez.</p><p>Ceza etkisi: oyuncunun karttan önceki maç puanlarıyla belirlenen önemi × 2,25. Kendi ceza dezavantajı ×{CARD_SUSPENSION_DISADVANTAGE_MULTIPLIER}, rakip eksikliği avantajı ×{OPPONENT_ABSENCE_ADVANTAGE_MULTIPLIER} ile ağırlıklandırılır.</p><p>Bu etki, kayıt güveni ve kategori ağırlığıyla çarpılır: cezalar için 0,35; penaltılar için 0,20. Genel endekste ayrıca 0,40 çarpanı kullanılır. Çarpanlar tek kez uygulanır.</p><p>Bunlar model tercihleridir; hakem hatası, maçın kazanılma ihtimali veya topla oynama oranına göre hesaplanmış bir ölçüm değildir. Normal kartlar, sakatlıklar ve maç sonucu puan getirmez. VAR kararları için yeterli veri henüz yoktur.</p><Link className="outline light" href="/methodology">Hesaplama yönteminin tamamı →</Link></div>}</section>
    <footer><span>4 Büyükler Endeksi · Denetlenebilir futbol analitiği</span><span>İtiraz ve öneriler: <a href="mailto:marco@pasha.com">marco@pasha.com</a></span><span>TFF · FotMob · Transfermarkt · 3 sezon</span></footer>
  </main>;
}
