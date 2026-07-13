/**
 * ListPressureCard (CRM) — ¿la presión de envío está quemando la base?
 *
 * Serie temporal mensual (más legible que un scatter, y muestra recencia/tendencia):
 *   barras = presión = envíos por suscriptor del mes (email_campaigns.sent / base activa)
 *   línea  = tasa de baja de la lista = subscribers.unsubs / base activa
 * Usamos envíos POR SUSCRIPTOR (no brutos) para no confundir presión con el crecimiento
 * de la lista. La correlación queda como dato de apoyo (correlación ≠ causa).
 * Fatiga a nivel de LISTA; la fatiga por suscriptor exige dato a nivel contacto (pendiente).
 */
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useSubscribers, useEmailCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { pearsonCorrelation } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const isSub = (s) => /^subscrib/i.test(String(s || ""));
const isUnsub = (s) => /^unsubscrib/i.test(String(s || ""));

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
    .map(k => ({
      ym: k, name: `${M[((k - 1) % 12) + 1]} ${String(Math.floor((k - 1) / 12)).slice(2)}`,
      presion: sentByM[k] / baseByM[k],                 // envíos por suscriptor
      rate: (unsubByM[k] / baseByM[k]) * 100,           // % de baja
    }))
    .slice(-18);

  const hasData = rows.length >= 4;

  if (!hasData) {
    return (
      <EvidenceCard sources={["connectif"]} question="¿La presión de envío está quemando la base?" answer="Datos insuficientes" answerTone="neutral"
        maturity="amber" delay={delay}
        actions={[{ verb: "investigar", rationale: "Se necesitan varios meses con envíos y bajas de lista para ver la relación." }]}
        note="Fuente: Connectif · email_campaigns (envíos) + subscribers (bajas de lista)." />
    );
  }

  const corr = pearsonCorrelation(rows.map(r => r.presion), rows.map(r => r.rate));
  const last = rows[rows.length - 1];
  const prev = rows[rows.length - 2];
  const avgRate = rows.reduce((s, r) => s + r.rate, 0) / rows.length;
  const rateTrend = prev ? last.rate - prev.rate : 0;
  const strong = corr != null && corr >= 0.4;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿La presión de envío está quemando la base?"
      answer={`${last.rate.toFixed(2)}% de baja este mes${rateTrend ? ` (${rateTrend >= 0 ? "+" : ""}${rateTrend.toFixed(2)} pts vs mes anterior)` : ""}`}
      answerTone={strong ? "bad" : "good"}
      context={strong
        ? `Cuando sube la presión (envíos por suscriptor), tiende a subir la baja — correlación ${corr.toFixed(2)}. Señal de fatiga de lista. Baja media ${avgRate.toFixed(2)}%.`
        : `No se ve una relación clara entre presión y bajas (correlación ${corr == null ? "—" : corr.toFixed(2)}). Baja media ${avgRate.toFixed(2)}%.`}
      maturity="green"
      severity={strong ? "medium" : undefined}
      actions={strong
        ? [{ verb: "investigar", rationale: "Baja la frecuencia o segmenta mejor en los meses de más presión. La fatiga por campaña individual se activará cuando el sync traiga las bajas por campaña." }]
        : [{ verb: "mantener", rationale: "La base tolera el ritmo actual; vigila si la línea de baja empieza a seguir a la presión." }]}
      delay={delay}
      note="Barras = envíos por suscriptor · línea = bajas / base activa, por mes (Connectif · email_campaigns + subscribers). Correlación sobre la presión normalizada; correlación ≠ causa. Fatiga a nivel de lista."
    >
      <div className={CHART_H}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(rows.length / 8))} />
            <YAxis yAxisId="p" {...AXIS} tickFormatter={v => v.toFixed(1)}
              label={{ value: "env./suscriptor", angle: -90, position: "insideLeft", fontSize: 9, fill: "hsl(37,44%,55%)", style: { textAnchor: "middle" } }} />
            <YAxis yAxisId="r" orientation="right" {...AXIS} tickFormatter={v => `${v.toFixed(1)}%`}
              label={{ value: "% baja", angle: 90, position: "insideRight", fontSize: 9, fill: "hsl(16,79%,50%)", style: { textAnchor: "middle" } }} />
            <Tooltip {...TIP} formatter={(v, n) => n === "Tasa de baja" ? [`${Number(v).toFixed(2)}%`, n] : [`${Number(v).toFixed(1)} env./suscriptor`, "Presión"]} />
            <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
            <Bar yAxisId="p" dataKey="presion" name="Presión (env./suscriptor)" fill="hsl(37,44%,76%)" radius={[2, 2, 0, 0]} maxBarSize={22} />
            <Line yAxisId="r" dataKey="rate" name="Tasa de baja" type="monotone" stroke="hsl(16,79%,57%)" strokeWidth={2.2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
