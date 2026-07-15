/**
 * Ga4DeviceCard (Marketing) — ¿cómo convierte el tráfico por dispositivo?
 * Usa ga4_device_daily (GA4 · deviceCategory): sesiones y compra por móvil/escritorio/tablet.
 * Revela la brecha de conversión móvil (mucho tráfico, poca compra) — palanca clásica de UX.
 * Comparación relativa (GA4 comportamiento). Respeta el periodo del comparador.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useGa4DeviceDaily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";

const LABEL = { mobile: "Móvil", desktop: "Escritorio", tablet: "Tablet", smart_tv: "Smart TV" };
const COLOR = { mobile: "hsl(16,79%,57%)", desktop: "hsl(186,32%,42%)", tablet: "hsl(30,72%,66%)" };

export default function Ga4DeviceCard({ delay }) {
  const { data = [] } = useGa4DeviceDaily();
  const { rangeB, inRange, labelRange } = useComparison();

  const rows = data.filter(r => inRange(rangeB, r));
  const byD = {};
  for (const r of rows) {
    const k = (r.device || "(sin dispositivo)");
    (byD[k] ||= { device: k, sessions: 0, purchases: 0, revenue: 0 });
    byD[k].sessions += Number(r.sessions) || 0;
    byD[k].purchases += Number(r.ecommerce_purchases) || 0;
    byD[k].revenue += Number(r.purchase_revenue) || 0;
  }
  const devs = Object.values(byD).filter(d => d.sessions > 0)
    .map(d => ({ ...d, name: LABEL[d.device] || d.device, conv: d.sessions ? (d.purchases / d.sessions) * 100 : 0 }))
    .sort((a, b) => b.sessions - a.sessions);
  const hasData = devs.length >= 1 && devs.some(d => d.purchases > 0);

  if (!hasData) {
    return (
      <EvidenceCard sources={["ga4"]}
        question="¿Cómo convierte el tráfico por dispositivo?"
        answer="Se enciende con el dato"
        answerTone="neutral"
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Requiere la tabla ga4_device_daily poblada: crear la tabla (supabase/create_ga4_device_daily.sql) y correr el sync de GA4 con la dimensión de dispositivo. Se enciende sola tras el próximo sync." }]}
        delay={delay}
        note="Fuente: GA4 · ga4_device_daily (deviceCategory). Pendiente del primer sync con la dimensión de dispositivo." />
    );
  }

  const totalSes = devs.reduce((s, d) => s + d.sessions, 0);
  const best = [...devs].filter(d => d.purchases > 0).sort((a, b) => b.conv - a.conv)[0] || devs[0];
  const worst = [...devs].filter(d => d.sessions >= totalSes * 0.05).sort((a, b) => a.conv - b.conv)[0];
  const mobile = devs.find(d => d.device === "mobile");
  const mobShare = mobile ? (mobile.sessions / totalSes) * 100 : 0;

  const chart = (dataKey, fmt, label, highlightName, highlightColor) => (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={devs} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
          <Tooltip formatter={(v, n, p) => [`${dataKey === "conv" ? Number(v).toFixed(2) + "%" : fmtNumber(v)} · ${fmtNumber(p.payload.sessions)} ses · ${fmtCurrency(p.payload.revenue)}`, label]} labelStyle={{ fontSize: 11 }} />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} maxBarSize={90}>
            {devs.map((d, i) => <Cell key={i} fill={highlightName && d.name === highlightName ? highlightColor : (COLOR[d.device] || "hsl(16,79%,57%)")} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const altView = chart("sessions", v => fmtNumber(v), "Sesiones", devs[0].name, "hsl(30,72%,66%)");

  return (
    <EvidenceCard sources={["ga4"]}
      question="¿Cómo convierte el tráfico por dispositivo?"
      answer={`${best.name} convierte más · ${best.conv.toFixed(1)}%`}
      answerTone="good"
      context={`Conversión (compra/sesión, GA4) por dispositivo · ${labelRange(rangeB)}. Móvil es el ${mobShare.toFixed(0)}% del tráfico (${fmtNumber(totalSes)} sesiones).`}
      maturity="amber"
      actions={[
        worst && worst.device === "mobile"
          ? { verb: "priorizar", rationale: `El móvil trae el ${mobShare.toFixed(0)}% del tráfico pero convierte solo ${worst.conv.toFixed(1)}% (vs ${best.conv.toFixed(1)}% en ${best.name}). Optimizar la ficha/checkout móvil es la mayor palanca.` }
          : { verb: "escalar", rationale: `«${best.name}» es el dispositivo que más convierte (${best.conv.toFixed(1)}%).` },
        { verb: "investigar", rationale: "Si un dispositivo con mucho tráfico convierte por debajo de la media, revisa velocidad, tamaño de botones y pasos del checkout en ese dispositivo." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Conversión", b: "Volumen" }}
      note="Fuente: GA4 · ga4_device_daily (deviceCategory): sesiones, carrito, checkout, compra y revenue por dispositivo. Conversión = compra/sesión (comportamiento GA4; válida para comparar dispositivos entre sí). Vista 'Volumen' = sesiones por dispositivo."
    >
      {chart("conv", v => `${v.toFixed(0)}%`, "Conversión", best.name, "hsl(160,60%,42%)")}
    </EvidenceCard>
  );
}
