import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEmailCampaigns } from "@/lib/useEntities";
import { latestMonthRows } from "@/lib/dss/dssUtils";
import { fmtNumber } from "@/lib/dashboardData";

// Detecta el campo de bajas si existe en los datos (puerta del dato).
function unsubOf(r) {
  const v = r.unsubscribes ?? r.unsub ?? r.emailUnsubscribes ?? r.unsubscribe;
  return typeof v === "number" ? v : null;
}

export default function ListFatigueCard({ delay }) {
  const { data = [] } = useEmailCampaigns();
  const rows = data.filter(r => r.emailName && r.sent > 100);
  const hasUnsub = rows.some(r => unsubOf(r) !== null);

  if (!hasUnsub) {
    return (
      <EvidenceCard
        question="¿Qué campañas generan fatiga de lista?"
        answer="Dato de bajas no disponible"
        answerTone="neutral"
        context="Las tablas actuales de Supabase (email_campaigns) no incluyen bajas por campaña."
        maturity="amber"
        actions={[
          { verb: "investigar", rationale: "La tasa de baja por campaña vive en el Audit (D04). Requiere añadir la columna de bajas al sync — trabajo de pipeline, fuera de src/." },
        ]}
        delay={delay}
        note="Puerta del dato: esta tarjeta se enciende cuando el dato de bajas por campaña esté en Supabase."
      />
    );
  }

  const latest = latestMonthRows(rows);
  const scope = latest.length >= 5 ? latest : rows;
  const pts = scope.map(c => ({
    name: c.emailName, sent: c.sent, x: c.sent,
    rate: (unsubOf(c) / c.sent) * 100, y: (unsubOf(c) / c.sent) * 100,
  }));
  const avg = pts.length ? pts.reduce((s, p) => s + p.rate, 0) / pts.length : 0;
  const risky = pts.filter(p => p.rate > avg * 1.8 && p.sent > 500).sort((a, b) => b.rate - a.rate);

  return (
    <EvidenceCard
      question="¿Qué campañas generan fatiga de lista?"
      answer={risky.length ? `${risky.length} campañas de riesgo` : "Fatiga bajo control"}
      answerTone={risky.length ? "bad" : "good"}
      context={`Tasa de baja media ${avg.toFixed(2)}%`}
      maturity="green"
      actions={risky.length
        ? [{ verb: "detener", rationale: `Alta tasa de baja: ${risky.slice(0,2).map(r => r.name).join(", ")}.` },
           { verb: "investigar", rationale: "Revisa frecuencia y segmentación de las de mayor baja." }]
        : [{ verb: "mantener", rationale: "Ninguna campaña dispara bajas anómalas." }]}
      delay={delay}
      note="Tasa de baja = bajas / envíos por campaña (D04)."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 12, bottom: 20, left: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis type="number" dataKey="x" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} tickFormatter={v => `${(v/1000).toFixed(0)}K`}
              label={{ value: "Volumen", position: "insideBottom", offset: -10, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
            <YAxis type="number" dataKey="y" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} tickFormatter={v => `${v.toFixed(1)}%`}
              label={{ value: "Baja %", angle: -90, position: "insideLeft", offset: 12, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
            <Tooltip formatter={(v, n) => [typeof v === "number" ? v.toFixed(2) : v, n]} />
            <Scatter data={pts}>
              {pts.map((p, i) => <Cell key={i} fill={p.rate > avg * 1.8 ? "hsl(224,76%,42%)" : "hsl(220,13%,65%)"} fillOpacity={0.8} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
