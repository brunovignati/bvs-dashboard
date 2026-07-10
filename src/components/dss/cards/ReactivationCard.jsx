import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEmailCampaigns, usePushCampaigns } from "@/lib/useEntities";
import { matchName } from "@/lib/dss/dssUtils";
import { fmtCurrency } from "@/lib/dashboardData";

const RX = /reactiv|reabast|recuper|winback|volver|te echamos/i;

export default function ReactivationCard({ delay }) {
  const { data: email = [] } = useEmailCampaigns();
  const { data: push = [] } = usePushCampaigns();

  const src = [
    ...email.filter(r => matchName(r, RX)).map(r => ({ name: r.emailName || r.emailWorkflow, channel: "Email", revenue: r.revenue || 0, sent: r.sent || 0, purchases: r.purchases || 0 })),
    ...push.filter(r => matchName(r, RX)).map(r => ({ name: r.workflow, channel: "Push", revenue: r.revenue || 0, sent: r.sent || 0, purchases: r.purchases || 0 })),
  ].filter(r => r.name);

  const byName = {};
  for (const r of src) {
    const k = `${r.name}`;
    if (!byName[k]) byName[k] = { name: k, channel: r.channel, revenue: 0, sent: 0, purchases: 0 };
    byName[k].revenue += r.revenue; byName[k].sent += r.sent; byName[k].purchases += r.purchases;
  }
  const agg = Object.values(byName).map(w => ({ ...w, conv: w.sent > 0 ? (w.purchases / w.sent) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const top = agg.slice(0, 6).map(w => ({ ...w, short: w.name.length > 24 ? w.name.slice(0, 23) + "…" : w.name }));
  const winner = agg[0];
  const weak = agg.filter(w => w.sent > 500 && w.conv < 0.2);
  const hasData = agg.length >= 2;
  const total = agg.reduce((s, w) => s + w.revenue, 0);

  return (
    <EvidenceCard
      question="¿Qué workflows de reactivación / reabastecimiento rinden?"
      answer={hasData && winner ? winner.name : "Sin flujos detectados"}
      answerTone={hasData ? "good" : "neutral"}
      context={hasData ? `${agg.length} flujos (email + push) · ${fmtCurrency(total)} generados` : "No se detectan flujos de reactivación por nombre."}
      maturity="green"
      actions={hasData ? [
        { verb: "escalar", rationale: winner ? `Mejor rendimiento: "${winner.name}".` : "Refuerza el de mayor revenue." },
        { verb: "mantener", rationale: "Conserva los flujos 30/60/90 días que reabastecen con regularidad." },
        ...(weak.length ? [{ verb: "detener", rationale: `Bajo retorno: ${weak.slice(0,2).map(w => w.name).join(", ")}.` }] : []),
      ] : [{ verb: "crear", rationale: "Si no hay flujos de reactivación activos, considera crear una secuencia 30/60/90 días." }]}
      delay={delay}
      note="Filtro por nombre (reactivación/reabastecimiento/recuperación) sobre D04 + D12."
    >
      {hasData && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `€${(v/1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="short" width={140} tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => [fmtCurrency(v), "Revenue"]} labelFormatter={(l, p) => p?.[0]?.payload?.name || l} labelStyle={{ fontSize: 10 }} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {top.map((w, i) => <Cell key={i} fill={w.channel === "Push" ? "hsl(220,55%,62%)" : i === 0 ? "hsl(220,55%,62%)" : "hsl(221,83%,53%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
