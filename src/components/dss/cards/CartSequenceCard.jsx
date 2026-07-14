/**
 * CartSequenceCard (Automatizaciones) — ¿qué email de la secuencia de carrito recupera más?
 * Usa `carrito` (detalle por email de la secuencia CA1/CA2/CA3, con embudo completo),
 * complementario al agregado que ya usa CartWinnerCard (cart_abandonment). Permite ver
 * qué paso de la cadena aporta más revenue y con qué conversión.
 */
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCarrito } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { latestMonthRows } from "@/lib/dss/dssUtils";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

const MO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };

export default function CartSequenceCard({ delay }) {
  const { data = [] } = useCarrito();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const inScope = data.filter(r => r.emailName && (r.sent || 0) > 0 && (r.year * 12 + r.month) <= cutoff);
  const month = latestMonthRows(inScope, cutoff);
  const scope = month.length ? month : inScope;

  const rows = scope.map(r => ({
    name: clip(r.emailName.replace(/^V!\s*/, ""), 26), full: r.emailName,
    revenue: r.revenue || 0, sent: r.sent || 0,
    conv: r.sent > 0 ? ((r.purchases || 0) / r.sent) * 100 : 0,
    purchases: r.purchases || 0,
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 8);
  const hasData = rows.length >= 2;
  const best = hasData ? rows[0] : null;
  const totalRev = rows.reduce((s, r) => s + r.revenue, 0);

  // ── Vista B — evolución mensual del revenue recuperado por la secuencia de carrito
  // (últimos 12 meses hasta el corte). ¿Recupera cada vez más o menos? ──
  const byMonth = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
    if (k > cutoff || !r.emailName) continue;
    (byMonth[k] ||= { k, year: r.year, month: r.month, revenue: 0, purchases: 0 });
    byMonth[k].revenue += r.revenue || 0; byMonth[k].purchases += r.purchases || 0;
  }
  const evo = Object.values(byMonth).sort((a, b) => a.k - b.k).slice(-12)
    .map(m => ({ name: `${MO[m.month]} ${String(m.year).slice(2)}`, revenue: m.revenue }));
  const altView = evo.length >= 2 ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v) => [fmtCurrency(v), "Recuperado"]} labelStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey="revenue" name="Recuperado" stroke="hsl(16,79%,57%)" strokeWidth={2.4} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  if (!hasData) {
    return (
      <EvidenceCard sources={["connectif"]} question="¿Qué email de la secuencia de carrito recupera más?" answer="Sin datos suficientes"
        answerTone="neutral" maturity="amber" delay={delay}
        actions={[{ verb: "investigar", rationale: "Faltan datos de los emails de carrito." }]}
        note="Fuente: Connectif · carrito (detalle por email de la secuencia)." />
    );
  }

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Qué email de la secuencia de carrito recupera más?"
      answer={`${best.name} · ${fmtCurrency(best.revenue)}`}
      answerTone="good"
      context={`${rows.length} emails de la secuencia · ${fmtCurrency(totalRev)} recuperados en el período. La conversión (compras/envíos) aparece en el tooltip.`}
      maturity="green"
      actions={[
        { verb: "escalar", rationale: `El paso que más recupera es "${best.name}" (conversión ${best.conv.toFixed(1)}%). Refuerza su copy/oferta.` },
        { verb: "investigar", rationale: "Si un paso de la cadena convierte muy poco, revisa el timing o fúndelo con el anterior." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Por email", b: "Evolución" }}
      note="Fuente: Connectif · carrito. Detalle por email de la secuencia (complementa el agregado de CartWinner). Vista 'Evolución' = revenue recuperado por la secuencia mes a mes."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
            <Tooltip labelFormatter={(l, p) => p?.[0]?.payload?.full || l} labelStyle={{ fontSize: 10 }}
              formatter={(v, n, p) => [`${fmtCurrency(v)} · ${p?.payload?.conv?.toFixed(2)}% conv · ${fmtNumber(p?.payload?.sent)} env.`, "Revenue"]} />
            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
              {rows.map((r, i) => <Cell key={i} fill={i === 0 ? "hsl(30,72%,66%)" : "hsl(16,79%,57%)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
