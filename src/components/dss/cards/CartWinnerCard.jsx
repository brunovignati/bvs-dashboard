import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCarrito } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

const MO = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function CartWinnerCard({ delay }) {
  // Fuente: `carrito` (informe por email de la secuencia de carrito) — trae envíos/aperturas/
  // clics REALES, a diferencia de `cart_abandonment` (informe de conversión, sin envíos → 0).
  const { data = [] } = useCarrito();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const rows = data.filter(r => r.emailName);

  // Agregar por plantilla/workflow de carrito a lo largo del histórico
  const byName = {};
  for (const r of rows) {
    const k = r.emailName;
    if (!byName[k]) byName[k] = { name: k, revenue: 0, purchases: 0, sent: 0, isAB: /test|a\/b/i.test(k) };
    byName[k].revenue += r.revenue || 0;
    byName[k].purchases += r.purchases || 0;
    byName[k].sent += r.sent || 0;
  }
  const agg = Object.values(byName).sort((a, b) => b.revenue - a.revenue);
  const top = agg.slice(0, 6).map(w => ({ ...w, short: w.name.length > 22 ? w.name.slice(0, 21) + "…" : w.name }));
  const winner = agg[0];
  const abVariants = agg.filter(w => w.isAB);
  const hasData = agg.length >= 2;
  const totalRecovered = agg.reduce((s, w) => s + w.revenue, 0);
  const totalSent = agg.reduce((s, w) => s + (w.sent || 0), 0);
  const totalPurch = agg.reduce((s, w) => s + (w.purchases || 0), 0);
  const totalConv = totalSent > 0 ? (totalPurch / totalSent) * 100 : null;   // recuperación real = compras/envíos
  const winnerConv = winner && winner.sent > 0 ? (winner.purchases / winner.sent) * 100 : null;

  // ── Vista B — evolución mensual del revenue recuperado por carrito (últimos 12 meses
  // hasta el corte). ¿Los flujos de carrito recuperan cada vez más? ──
  const byMonth = {};
  for (const r of rows) {
    const k = r.year * 12 + r.month;
    if (k > cutoff) continue;
    (byMonth[k] ||= { k, year: r.year, month: r.month, revenue: 0 });
    byMonth[k].revenue += r.revenue || 0;
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

  const actions = hasData ? [
    { verb: "escalar", rationale: winner ? `Mayor revenue recuperado: "${winner.name}"${winnerConv != null ? ` (recupera el ${winnerConv.toFixed(1)}% de sus envíos)` : ""}.` : "Prioriza el flujo con más revenue recuperado." },
    ...(abVariants.length >= 2
      ? [{ verb: "mantener", rationale: `Declara ganador del A/B (${abVariants.length} variantes) y consérvalo; retira la perdedora.` }]
      : [{ verb: "mantener", rationale: "Conserva el flujo ganador; vigila el resto." }]),
    { verb: "detener", rationale: agg.length > 3 ? `Considera consolidar los ${agg.length} flujos: retira los de aporte marginal.` : "Retira flujos de aporte marginal." },
  ] : [{ verb: "investigar", rationale: "Aún no hay suficientes flujos de carrito para comparar." }];

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Qué workflow de carrito gana (incl. A/B) y cuál consolido?"
      answer={hasData && winner ? winner.name : "Sin datos de carrito"}
      answerTone={hasData ? "good" : "neutral"}
      context={hasData ? `${agg.length} emails de carrito · ${fmtCurrency(totalRecovered)} recuperados${totalConv != null ? ` · tasa de recuperación media ${totalConv.toFixed(1)}% (compras/envíos)` : ""}` : undefined}
      maturity="green"
      actions={actions}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Ranking", b: "Evolución" }}
      note="Fuente: Connectif · carrito (informe por email de la secuencia de carrito, con envíos/aperturas/clics REALES). Antes se usaba cart_abandonment, cuyo informe de conversión no trae envíos (sent=0), por lo que no se podía calcular la tasa de recuperación. Tasa de recuperación = compras / envíos. A/B detectado por nombre. Vista 'Evolución' = revenue recuperado por carrito mes a mes (hasta el fin del periodo)."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `€${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="short" width={130} tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n, o) => [fmtCurrency(v), "Revenue"]} labelFormatter={(l, p) => p?.[0]?.payload?.name || l} labelStyle={{ fontSize: 10, maxWidth: 220 }} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {top.map((w, i) => <Cell key={i} fill={w.isAB ? "hsl(37,42%,74%)" : i === 0 ? "hsl(30,72%,66%)" : "hsl(16,79%,57%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
