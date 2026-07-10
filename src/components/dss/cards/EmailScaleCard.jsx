import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEmailCampaigns } from "@/lib/useEntities";
import { latestMonthRows } from "@/lib/dss/dssUtils";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-2.5 shadow-xl max-w-56">
      <p className="text-xs font-semibold mb-1 line-clamp-2">{d.name}</p>
      <p className="text-[11px] text-muted-foreground">RPMil: <span className="font-mono text-blue-600">€{d.rpm.toFixed(1)}</span></p>
      <p className="text-[11px] text-muted-foreground">Enviados: <span className="font-mono">{fmtNumber(d.sent)}</span></p>
      <p className="text-[11px] text-muted-foreground">Revenue: <span className="font-mono">{fmtCurrency(d.revenue)}</span></p>
    </div>
  );
};

export default function EmailScaleCard({ delay }) {
  const { data = [] } = useEmailCampaigns();
  let rows = data.filter(r => r.emailName && r.sent > 100);
  const latest = latestMonthRows(rows);
  const scope = latest.length >= 5 ? latest : rows;
  const periodNote = latest.length >= 5 ? "último mes" : "histórico";

  const pts = scope.map(c => ({
    name: c.emailName,
    sent: c.sent,
    revenue: c.revenue || 0,
    rpm: c.sent > 0 ? ((c.revenue || 0) / c.sent) * 1000 : 0,
  }));
  const rpms = pts.map(p => p.rpm).sort((a, b) => a - b);
  const q50 = rpms[Math.floor(rpms.length * 0.5)] || 0;
  const q75 = rpms[Math.floor(rpms.length * 0.75)] || 0;
  const avgRpm = pts.length ? pts.reduce((s, p) => s + p.rpm, 0) / pts.length : 0;

  // Salud del email en el período: apertura y CTR (agregado sobre email_campaigns).
  const tot = scope.reduce((a, c) => ({ sent: a.sent + (c.sent || 0), opens: a.opens + (c.opens || 0), clicks: a.clicks + (c.clicks || 0) }), { sent: 0, opens: 0, clicks: 0 });
  const openRate = tot.sent > 0 ? (tot.opens / tot.sent) * 100 : 0;
  const ctr = tot.sent > 0 ? (tot.clicks / tot.sent) * 100 : 0;

  const scatter = pts.map(p => ({ ...p, x: p.sent, y: p.rpm, z: Math.max(60, Math.min(600, p.revenue / 5)) }));
  const byRpm = [...pts].sort((a, b) => b.rpm - a.rpm);
  const top = byRpm.slice(0, 3);
  const bottom = byRpm.filter(p => p.sent > 500).slice(-3).reverse();

  const color = (p) => p.rpm >= q75 ? "hsl(220,55%,62%)" : p.rpm >= q50 ? "hsl(221,83%,53%)" : "hsl(220,13%,65%)";

  const hasData = pts.length >= 3;

  return (
    <EvidenceCard
      question="¿Rinde el email y qué campañas escalo?"
      kpis={hasData ? [
        { value: `${openRate.toFixed(1)}%`, label: `Apertura · ${periodNote}` },
        { value: `${ctr.toFixed(1)}%`, label: "CTR" },
        { value: `€${avgRpm.toFixed(1)}`, label: "Revenue / 1.000 env." },
      ] : undefined}
      answer={!hasData ? "Sin campañas suficientes" : undefined}
      maturity="green"
      insight={hasData
        ? `Apertura ${openRate.toFixed(1)}% y CTR ${ctr.toFixed(1)}% en ${scope.length} campañas (${periodNote}). Escalar la de mayor eficiencia${top[0] ? `: ${top[0].name}` : ""}.`
        : undefined}
      actions={hasData ? [
        { verb: "escalar", rationale: top.length ? `Alta eficiencia (revenue/1.000 env.): ${top.map(t => t.name).slice(0,2).join(", ")}.` : "Replica las de mayor RPMil." },
        { verb: "detener", rationale: bottom.length ? `Bajo retorno con volumen alto: ${bottom.map(b => b.name).slice(0,2).join(", ")}.` : "Retira las de RPMil bajo persistente." },
      ] : [{ verb: "investigar", rationale: "Aún no hay suficientes campañas con volumen para decidir." }]}
      delay={delay}
      note="Apertura = opens/enviados · CTR = clics/enviados · Revenue/1.000 env. sobre email_campaigns."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 12, bottom: 22, left: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" dataKey="x" name="Enviados" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }}
                tickFormatter={v => `${(v/1000).toFixed(0)}K`}
                label={{ value: "Volumen enviado", position: "insideBottom", offset: -12, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
              <YAxis type="number" dataKey="y" name="RPMil" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }}
                tickFormatter={v => `€${v.toFixed(0)}`}
                label={{ value: "€ / 1.000 env.", angle: -90, position: "insideLeft", offset: 16, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
              <ZAxis type="number" dataKey="z" range={[40, 400]} />
              <Tooltip content={<Tip />} />
              {avgRpm > 0 && <ReferenceLine y={avgRpm} stroke="hsl(220,13%,75%)" strokeDasharray="4 4" />}
              <Scatter data={scatter}>
                {scatter.map((p, i) => <Cell key={i} fill={color(p)} fillOpacity={0.8} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
