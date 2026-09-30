"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import { BarChart3, BookOpen, ChevronDown, ExternalLink, Scale, ShieldCheck, SlidersHorizontal, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ledgerEvents } from "@/data/ledger";
import { importedMatches } from "@/data/matches";
import { teams } from "@/data/teams";
import { scoreEvents } from "@/scoring/engine";
import type { SeasonId, Team } from "@/schemas/domain";

const seasons: SeasonId[] = ["2023-24", "2024-25", "2025-26"];
const metrics = [
  ["Kartlar", "Sarı, ikinci sarı, direkt kırmızı ve rakip kartları", "VERIFIED"],
  ["Oyuncu kartları", "Oyuncu, kart türü, dakika ve resmî TFF kimliği", "VERIFIED"],
  ["Penaltı golleri", "TFF gol kaydında (P) işaretli penaltı golleri", "VERIFIED"],
  ["Hakemler", "Orta hakem, yardımcı hakemler, VAR ve AVAR görevlileri", "VERIFIED"],
  ["Dinlenme / fikstür", "Lig maçları arasındaki doğrulanmış gün farkı", "TÜRETİLMİŞ"],
  ["Rakip gücü", "Rakibin maç öncesi lig puan ortalaması", "TÜRETİLMİŞ"],
  ["Kart sonrası eksikler", "Kırmızı/ikinci sarı sonrası bir sonraki lig kadrosunda bulunmama", "TÜRETİLMİŞ"],
  ["Kritik cezalar", "Son beş maçtaki ilk 11 payı ve sıradaki derbi çarpanı", "TÜRETİLMİŞ"],
  ["Rakip eksikleri", "Aynı temel olayın rakibe yazılan dolaylı avantajı", "TÜRETİLMİŞ"],
  ["VAR görevlendirmeleri", "VAR ve AVAR isimleri; karar doğruluğu iddiası içermez", "VERIFIED"],
  ["Kadro mevcudiyeti", "Son beş maçta düzenli başlayan oyuncuların maç kadrosunda bulunması", "TÜRETİLMİŞ"],
] as const;

const value = (n: number | null) => n === null ? "—" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}`;
const TeamName = ({ team }: { team: Team }) => <span className="team-name"><Image src={team.logoUrl} alt={`${team.name} logosu`} width={34} height={34}/><b>{team.name}</b></span>;

function seasonStats(teamId: string, season: SeasonId) {
  const matches = importedMatches.filter((match) => match.season === season && (match.homeTeam.teamId === teamId || match.awayTeam.teamId === teamId) && match.score.home !== null && match.score.away !== null);
  return matches.reduce((result, match) => {
    const home = match.homeTeam.teamId === teamId;
    const gf = home ? match.score.home! : match.score.away!;
    const ga = home ? match.score.away! : match.score.home!;
    result.played++; result.gf += gf; result.ga += ga;
    if (gf > ga) { result.won++; result.points += 3; } else if (gf === ga) { result.drawn++; result.points++; } else result.lost++;
    return result;
  }, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
}

function cardStats(teamId: string, season: SeasonId) {
  const matches = importedMatches.filter((match) => match.season === season && (match.homeTeam.teamId === teamId || match.awayTeam.teamId === teamId));
  const own = matches.flatMap((match) => match.details?.cards ?? []).filter((card) => card.teamId === teamId);
  const opponent = matches.flatMap((match) => match.details?.cards ?? []).filter((card) => card.teamId !== teamId);
  const count = (cards: typeof own, type: string) => cards.filter((card) => card.type === type).length;
  return { yellow: count(own, "yellow"), secondYellow: count(own, "second_yellow"), red: count(own, "red"), opponent: opponent.length };
}

export function Dashboard() {
  const [adjusted, setAdjusted] = useState(true);
  const [formulaOpen, setFormulaOpen] = useState(false);
  const [openMetric, setOpenMetric] = useState<string | null>(null);
  const seasonScores = useMemo(() => new Map(seasons.map((season) => [season, scoreEvents(ledgerEvents.filter((event) => event.season === season), "general", adjusted)])), [adjusted]);
  const ranking = useMemo(() => scoreEvents(ledgerEvents, "general", adjusted).sort((a, b) => (b.net ?? -Infinity) - (a.net ?? -Infinity)), [adjusted]);
  const chartData = ranking.map((score) => ({ team: teams.find((team) => team.id === score.teamId)?.shortName, direct: score.direct ?? 0, indirect: score.indirect ?? 0, disadvantage: score.disadvantage === null ? 0 : -score.disadvantage }));
  const suspensionCount = ledgerEvents.filter((event) => !event.isMock && event.eventType === "SUSPENSION").length;
  const availabilityCount = ledgerEvents.filter((event) => !event.isMock && event.eventType === "INJURY").length;
  const lineupPlayers = importedMatches.reduce((sum, match) => sum + (match.details?.lineups.home.starters.length ?? 0) + (match.details?.lineups.home.bench.length ?? 0) + (match.details?.lineups.away.starters.length ?? 0) + (match.details?.lineups.away.bench.length ?? 0), 0);
  const ledgerPreview = ["CARD", "PENALTY", "SCHEDULE", "OPPONENT_STRENGTH", "SUSPENSION", "INJURY"].flatMap((type) => ledgerEvents.filter((event) => !event.isMock && event.eventType === type).slice(0, 4));
  return <main>
    <header className="site-header"><Link className="brand" href="/"><Scale size={19}/> DÖRT BÜYÜKLER ENDEKSİ</Link><nav><a href="#siralama">Sıralama</a><a href="#uc-sezon">3 sezon</a><a href="#ham-veri">Veri kapsamı</a><Link href="/data">Veri gezgini</Link><Link href="/methodology">Metodoloji</Link></nav></header>
    <section className="hero audit-hero"><p className="eyebrow">DENETLENEBİLİR FUTBOL ANALİTİĞİ · 3 SEZON</p><h1>4 Büyükler Avantaj /<br/><em>Dezavantaj Endeksi</em></h1><p>2023-24, 2024-25 ve 2025-26 sezonları tek görünümde. Kartlar, penaltı golleri, lig içi dinlenme aralığı ve maç öncesi rakip gücü aynı olay defterinde hesaplanır.</p><div className="principle"><ShieldCheck size={19}/><span><b>Önce veri.</b> Pozitif skor kasıtlı kayırmanın, negatif skor kasıtlı mağduriyetin kanıtı değildir.</span></div></section>
    <section className="formula-band"><div className="formula-head"><div><p className="eyebrow">UYGULANAN FORMÜL</p><h2>Net avantaj endeksi</h2></div><button className="outline light" onClick={() => setFormulaOpen(!formulaOpen)}><SlidersHorizontal size={15}/> Formülü {formulaOpen ? "Kapat" : "Aç"}</button></div><div className="formula"><b>Doğrudan avantaj</b><span>+</span><b>Dolaylı avantaj</b><span>−</span><b>Kendi dezavantajı</b><span>=</span><strong>NET</strong></div>{formulaOpen && <div className="formula-detail"><p>Genel çevre: Hakem etkisi %40 · Rakip mevcudiyeti %20 · Kadro mevcudiyeti %15 · Fikstür %10 · Rakip gücü %10 · Diğer %5</p><p>Hakem alt endeksi: Disiplin %25 · Kritik ceza %25 · Penaltı %20 · VAR %20 · Diğer %10</p><small>Hesapta kartlar, penaltı golleri, kart sonrası eksikler, kadro sürekliliği, lig içi dinlenme ve maç öncesi rakip gücü bulunur.</small></div>}</section>
    <section id="siralama" className="section ranking-section"><div className="section-heading"><div><p className="eyebrow">FORMÜLE GÖRE GENEL SONUÇ</p><h2>3 sezon avantaj endeksi sıralaması</h2></div><label className="toggle"><input type="checkbox" checked={adjusted} onChange={(event) => setAdjusted(event.target.checked)}/> Güvene göre ayarla</label></div><div className="table-scroll"><table className="summary-table ranking-table"><thead><tr><th>#</th><th>Takım</th>{seasons.map((season) => <th key={season}>{season}</th>)}<th>Doğrudan</th><th>Dolaylı</th><th>Dezavantaj</th><th>Toplam endeks</th></tr></thead><tbody>{ranking.map((score, index) => { const team = teams.find((item) => item.id === score.teamId)!; return <tr key={team.id}><td><span className={`rank rank-${index + 1}`}>{index + 1}</span></td><th><TeamName team={team}/></th>{seasons.map((season) => <td key={season}>{value(seasonScores.get(season)?.find((item) => item.teamId === team.id)?.net ?? null)}</td>)}<td className="positive">{value(score.direct)}</td><td>{value(score.indirect)}</td><td className="negative">{score.disadvantage === null ? "—" : `−${score.disadvantage.toFixed(1)}`}</td><td><strong className={score.net !== null && score.net >= 0 ? "positive" : "negative"}>{value(score.net)}</strong></td></tr>; })}</tbody></table></div><p className="subtle"><Trophy size={14}/> Sıralama tüm üç sezonun doğrulanmış ve hesaplanabilir olaylarının toplamıdır; karar doğruluğu iddiası değildir.</p></section>
    <section id="uc-sezon" className="section official-data"><div className="section-heading"><div><p className="eyebrow">RESMÎ TFF MAÇ SONUÇLARI</p><h2>Üç sezon performansı</h2></div><span className="verified-pill">396 MAÇ · VERIFIED</span></div><div className="table-scroll"><table className="summary-table three-season-table"><thead><tr><th>Takım</th>{seasons.map((season) => <th key={season}>{season}</th>)}</tr></thead><tbody>{teams.map((team) => <tr key={team.id}><th><TeamName team={team}/></th>{seasons.map((season) => { const stats = seasonStats(team.id, season); return <td key={season} className="season-cell"><b>{stats.points} puan</b><small>{stats.played} maç · {stats.won}G {stats.drawn}B {stats.lost}M · {stats.gf}:{stats.ga}</small></td>; })}</tr>)}</tbody></table></div></section>
    <section className="section official-data"><div className="section-heading"><div><p className="eyebrow">RESMÎ TFF OLAY VERİSİ</p><h2>Üç sezon kart görünümü</h2></div><span className="verified-pill">1.841 KART · VERIFIED</span></div><div className="table-scroll"><table className="summary-table three-season-table"><thead><tr><th>Takım</th>{seasons.map((season) => <th key={season}>{season}</th>)}</tr></thead><tbody>{teams.map((team) => <tr key={team.id}><th><TeamName team={team}/></th>{seasons.map((season) => { const stats = cardStats(team.id, season); return <td key={season} className="season-cell"><b>{stats.yellow} sarı · {stats.secondYellow} ikinci sarı · {stats.red} kırmızı</b><small>Rakip kartları: {stats.opponent}</small></td>; })}</tr>)}</tbody></table></div></section>
    <section className="section split"><article className="panel chart-panel"><p className="eyebrow">3 SEZON ETKİ AYRIŞIMI</p><h2>Avantaj ve dezavantaj bileşenleri</h2><div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="team"/><YAxis/><Tooltip/><Legend/><Bar dataKey="direct" name="Doğrudan" fill="#147d64"/><Bar dataKey="indirect" name="Dolaylı" fill="#3478bd"/><Bar dataKey="disadvantage" name="Dezavantaj" fill="#c4495b"/></BarChart></ResponsiveContainer></div></article><article className="panel evidence-panel"><p className="eyebrow">VERİ KAPSAMI</p><h2>Endeksi besleyen kayıtlar</h2><dl><div><dt>Maç</dt><dd>396</dd></div><div><dt>Kart olayı</dt><dd>1.841</dd></div><div><dt>Gol olayı</dt><dd>1.228</dd></div><div><dt>Penaltı golü</dt><dd>126</dd></div><div><dt>Kadro kaydı</dt><dd>{lineupPlayers.toLocaleString("tr-TR")}</dd></div><div><dt>Kart sonrası eksik</dt><dd>{suspensionCount}</dd></div><div><dt>Kadro sürekliliği</dt><dd>{availabilityCount}</dd></div><div><dt>Ana hakem</dt><dd>38</dd></div></dl><p className="subtle">Kadro eksikliği gözlemdir; sağlık nedeni yayımlanmadığında “sakatlık” olarak etiketlenmez. Penaltı sayısı TFF gol kaydındaki `(P)` işaretidir.</p></article></section>
    <section id="ham-veri" className="section"><p className="eyebrow">TAMAMLANAN VERİ KAPSAMI</p><h2>Endeks hangi başlıklardan oluşuyor?</h2><p className="section-intro">Bütün başlıklar TFF ham kayıtlarına ya da açıkça tanımlanmış deterministik türevlere bağlıdır. Sağlık nedeni ve VAR karar doğruluğu gibi yayımlanmayan bilgiler iddia edilmez.</p><div className="metric-list">{metrics.map(([name, description, status]) => <article key={name} className={openMetric === name ? "metric open" : "metric"}><button onClick={() => setOpenMetric(openMetric === name ? null : name)}><span className="metric-icon"><BarChart3 size={17}/></span><span><b>{name}</b><small>{description}</small></span><span className="metric-status verified">{status}</span><ChevronDown size={18}/></button>{openMetric === name && <div className="metric-detail"><p>Bu başlık repo içindeki TFF JSON kayıtlarından doğrulanır veya yeniden üretilebilir biçimde türetilir.</p><Link href={`/data?category=${encodeURIComponent(name)}`}>Veri gezgininde aç <ExternalLink size={13}/></Link></div>}</article>)}</div></section>
    <section className="section ledger"><div className="section-heading"><div><p className="eyebrow">TEKNİK MERKEZ</p><h2>Event Ledger örnekleri</h2></div><Link className="outline" href="/data">Tüm kayıtları aç</Link></div><div className="table-scroll"><table><thead><tr><th>Event ID</th><th>Sezon</th><th>Tür</th><th>Maç</th><th>Kalite</th><th>Güven</th><th>Puanlama</th></tr></thead><tbody>{ledgerPreview.map((event) => <tr key={event.eventId}><td><code>{event.eventId}</code></td><td>{event.season}</td><td>{event.eventType}</td><td>{event.matchLabel}</td><td><span className="quality verified">{event.quality}</span></td><td>%{Math.round(event.confidence * 100)}</td><td><span className="metric-status verified">Dahil</span></td></tr>)}</tbody></table></div></section>
    <section className="method-cta"><div><BookOpen size={26}/><p className="eyebrow">AÇIK METODOLOJİ</p><h2>Hiçbir skor kara kutu olmamalı.</h2><p>Formüller, ağırlıklar, güven sistemi ve her olayın kaynağı incelenebilir.</p></div><Link className="outline light" href="/methodology">Metodolojiyi incele →</Link></section>
    <footer><span>4 Büyükler Endeksi · Denetlenebilir futbol analitiği</span><span>İtiraz ve öneriler: <a href="mailto:marco@pasha.com">marco@pasha.com</a></span><span>TFF kaynakları · 3 sezon</span></footer>
  </main>;
}
