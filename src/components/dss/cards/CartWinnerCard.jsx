import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCartAbandonment } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

export default function CartWinnerCard({ delay }) {
  const { data = [] } = useCartAbandonment();
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

  const actions = hasData ? [
    { verb: "escalar", rationale: winner ? `Mayor revenue recuperado: "${winner.name}".` : "Prioriza el flujo con más revenue recuperado." },
    ...(abVariants.length >= 2
      ? [{ verb: "mantener", rationale: `Declara ganador del A/B (${abVariants.length} variantes) y consérvalo; retira la perdedora.` }]
      : [{ verb: "mantener", rationale: "Conserva el flujo ganador; vigila el resto." }]),
    { verb: "detener", rationale: agg.length > 3 ? `Considera consolidar los ${agg.length} flujos: retira los de aporte marginal.` : "Retira flujos de aporte marginal." },
  ] : [{ verb: "investigar", rationale: "Aún no hay suficientes flujos de carrito para comparar." }];

  return (
    <EvidenceCard
      question="¿Qué workflow de carrito gana (incl. A/B) y cuál consolido?"
      answer={hasData && winner ? winner.name : "Sin datos de carrito"}
      answerTone={hasData ? "good" : "neutral"}
      context={hasData ? `${agg.length} flujos · ${fmtCurrency(totalRecovered)} recuperados en total` : undefined}
      maturity="green"
      actions={actions}
      delay={delay}
      note="Revenue recuperado agregado por plantilla de carrito (D05/D06). A/B detectado por nombre."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `€${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="short" width={130} tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n, o) => [fmtCurrency(v), "Revenue"]} labelFormatter={(l, p) => p?.[0]?.payload?.name || l} labelStyle={{ fontSize: 10, maxWidth: 220 }} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {top.map((w, i) => <Cell key={i} fill={w.isAB ? "hsl(199,60%,78%)" : i === 0 ? "hsl(199,80%,64%)" : "hsl(199,89%,48%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
