/**
 * ListPressureCard (CRM) — ¿la presión de envío está quemando la base?
 *
 * Cruce a nivel de LISTA (dato agregado disponible hoy en Supabase):
 *   eje X = envíos de email del mes (email_campaigns · presión)
 *   eje Y = tasa de baja mensual de la lista = subscribers.unsubs / base activa
 * Cada punto es un mes. La correlación indica si más presión se asocia a más bajas.
 * NOTA: es fatiga a nivel de lista, no por suscriptor (eso exige dato a nivel contacto,
 * pendiente de export de Connectif). Complementa a "fatiga por campaña" (Marketing).
 */
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useSubscribers, useEmailCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { pearsonCorrelation } from "@/lib/dashboardData";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const isSub = (s) => /^subscrib/i.test(String(s || ""));       // "subscribed"
const isUnsub = (s) => /^unsubscrib/i.test(String(s || ""));   // "unsubscribed"

export default function ListPressureCard({ delay }) {
  const { data: subs = [] } = useSubscribers();
  const { data: emails = [] } = useEmailCampaigns();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const sentByM = {};
  for (const r of emails) { const k = r.year * 12 + r.month; if (k <= cutoff) sentByM[k] = (sentByM[k] || 0) + (r.sent || 0); }
  const baseByM = {}, unsubByM = {};
  for (const r of subs) {
    const k = r.year * 12 + r.month; if (k > cutoff) continue;
    if (isSub(r.status)) baseByM[k] = r.contacts || 0;
    if (isUnsub(r.status)) unsubByM[k] = r.unsubs || 0;
  }
  const rows = Object.keys(sentByM).map(Number)
    .filter(k => baseByM[k] > 0 && unsubByM[k] != null && sentByM[k] > 0)
    .sort((a, b) => a - b)
    .map(k => ({ ym: k, name: `${M[((k - 1) % 12) + 1]} ${String(Math.floor((k - 1) / 12)).slice(2)}`,
      x: sentByM[k], y: (unsubByM[k] / baseByM[k]) * 100, sent: sentByM[k], unsubs: unsubByM[k] }));

  const hasData = rows.length >= 4;

  if (!hasData) {
    return (
      <EvidenceCard question="¿La presión de envío está quemando la base?" answer="Datos insuficientes" answerTone="neutral"
        maturity="amber" delay={delay}
        actions={[{ verb: "investigar", rationale: "Se necesitan varios meses con envíos y bajas de lista para ver la relación." }]}
        note="Fuente: Connectif · email_campaigns (envíos) + subscribers (bajas de lista)." />
    );
  }

  const corr = pearsonCorrelation(rows.map(r => r.x), rows.map(r => r.y));
  const last = rows[rows.length - 1];
  const avgRate = rows.reduce((s, r) => s + r.y, 0) / rows.length;
  const strong = corr != null && corr >= 0.4;

  return (
    <EvidenceCard
      question="¿La presión de envío está quemando la base?"
      answer={`${last.y.toFixed(2)}% baja · correlación ${corr == null ? "—" : corr.toFixed(2)}`}
      answerTone={strong ? "bad" : "good"}
      context={strong
        ? `Más envíos se asocian a más bajas (correlación ${corr.toFixed(2)}): señal de fatiga de lista. Tasa de baja media ${avgRate.toFixed(2)}%.`
        : `Sin relación clara entre volumen de envío y bajas (correlación ${corr == null ? "—" : corr.toFixed(2)}). Tasa de baja media ${avgRate.toFixed(2)}%.`}
      maturity="green"
      severity={strong ? "medium" : undefined}
      actions={strong
        ? [{ verb: "investigar", rationale: "Baja la frecuencia o segmenta mejor: la lista reacciona al volumen. Cruza con la fatiga por campaña (Marketing)." }]
        : [{ verb: "mantener", rationale: "La base tolera el ritmo de envío actual; vigila si la correlación sube." }]}
      delay={delay}
      note="Cada punto = un mes. X = envíos de email (Connectif · email_campaigns) · Y = bajas de lista / base activa (Connectif · subscribers). Fatiga a nivel de lista; la fatiga por suscriptor exige dato a nivel contacto (pendiente)."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 12, bottom: 22, left: 6 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
            <XAxis type="number" dataKey="x" name="Envíos" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }}
              tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
              label={{ value: "Envíos del mes", position: "insideBottom", offset: -12, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
            <YAxis type="number" dataKey="y" name="Baja %" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }}
              tickFormatter={v => `${v.toFixed(1)}%`}
              label={{ value: "Tasa de baja", angle: -90, position: "insideLeft", offset: 12, fontSize: 9, fill: "hsl(220,10%,50%)" }} />
            <Tooltip formatter={(v, n) => n === "Baja %" ? [`${Number(v).toFixed(2)}%`, "Tasa de baja"] : [fmtNumber(v), "Envíos"]}
              labelFormatter={() => ""} cursor={{ strokeDasharray: "3 3" }} />
            <ReferenceLine y={avgRate} stroke="hsl(220,13%,75%)" strokeDasharray="4 4" />
            <Scatter data={rows}>
              {rows.map((r, i) => <Cell key={i} fill={i === rows.length - 1 ? "hsl(221,83%,53%)" : "hsl(220,13%,65%)"} fillOpacity={0.85} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
