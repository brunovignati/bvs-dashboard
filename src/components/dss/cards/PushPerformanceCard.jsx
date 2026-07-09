import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { usePushCampaigns } from "@/lib/useEntities";
import { latestMonthRows } from "@/lib/dss/dssUtils";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

const Tip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-lg p-2.5 shadow-xl max-w-56">
      <p className="text-xs font-semibold mb-1 line-clamp-2">{d.name}</p>
      <p className="text-[11px] text-muted-foreground">Conversión: <span className="font-mono">{d.conv.toFixed(2)}%</span></p>
      <p className="text-[11px] text-muted-foreground">Enviados: <span className="font-mono">{fmtNumber(d.sent)}</span></p>
      <p className="text-[11px] text-muted-foreground">Revenue: <span className="font-mono text-emerald-600">{fmtCurrency(d.revenue)}</span></p>
    </div>
  );
};

export default function PushPerformanceCard({ delay }) {
  const { data = [] } = usePushCampaigns();
  let rows = data.filter(r => r.workflow && r.sent > 50);
  const latest = latestMonthRows(rows);
  const scope = latest.length >= 5 ? latest : rows;
  const periodNote = latest.length >= 5 ? "último mes" : "histórico";

  const pts = scope.map(c => ({
    name: c.workflow,
    sent: c.sent,
    revenue: c.revenue || 0,
    conv: c.sent > 0 ? ((c.purchases || 0) / c.sent) * 100 : 0,
  }));
  const scatter = pts.map(p => ({ ...p, x: p.sent, y: p.conv, z: Math.max(50, Math.min(500, p.revenue / 4)) }));
  const byRev = [...pts].sort((a, b) => b.revenue - a.revenue);
  const top = byRev.slice(0, 3);
  const weak = pts.filter(p => p.sent > 300 && p.conv < 0.3).slice(0, 3);
  const hasData = pts.length >= 3;
  const avgConv = pts.length ? pts.reduce((s, p) => s + p.conv, 0) / pts.length : 0;

  const color = (p) => p.conv >= avgConv * 1.5 ? "hsl(160,84%,39%)" : p.conv >= avgConv ? "hsl(280,65%,60%)" : "hsl(220,13%,65%)";

  return (
    <EvidenceCard
      question="¿Qué campañas push rinden y cuáles no?"
      answer={hasData && top[0] ? `Top: ${top[0].name}` : "Sin campañas suficientes"}
      answerTone={hasData ? "good" : "neutral"}
      context={hasData ? `${scope.length} campañas (${periodNote}) · conversión media ${avgConv.toFixed(2)}%` : undefined}
      maturity="green"
      actions={hasData ? [
        { verb: "escalar", rationale: top.length ? `Mayor revenue: ${top.map(t => t.name).slice(0,2).join(", ")}.` : "Refuerza las de mayor revenue y conversión." },
        { verb: "detener", rationale: weak.length ? `Volumen alto y conversión <0,3%: ${weak.map(w => w.name).slice(0,2).join(", ")}.` : "Retira las de conversión persistentemente baja." },
      ] : [{ verb: "investigar", rationale: "Aún no hay suficientes campañas push con volumen." }]}
      delay={delay}
      note="Conversión = compras / envíos por campaña push (D12)."
    >
      {hasData && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 12, bottom: 22, left: 6 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
              <XAxis type="number" dataKey="x" name="Enviados" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }}
                tickFormatter={v => `${(v/1000).toFixed(0)}K`}
                label={{ value: "Alcance (envíos)", position: "insideBottom", offset: -12, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
              <YAxis type="number" dataKey="y" name="Conv" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }}
                tickFormatter={v => `${v.toFixed(1)}%`}
                label={{ value: "Conversión %", angle: -90, position: "insideLeft", offset: 12, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
              <ZAxis type="number" dataKey="z" range={[40, 380]} />
              <Tooltip content={<Tip />} />
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
