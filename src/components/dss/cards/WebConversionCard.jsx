/**
 * WebConversionCard (Marketing) — ¿convierte el tráfico web?
 * Cruza GA4 (sesiones) con Connectif (pedidos + revenue) por día para responder la
 * pregunta que ninguna fuente sola responde: cuánto convierte y monetiza el tráfico.
 *   · Pedidos por 100 sesiones (proxy de conversión del sitio)
 *   · Revenue por sesión (monetización de la visita)
 * Aproximación honesta: las sesiones son WEB (GA4); pedidos/revenue incluyen todos los
 * canales (Connectif), así que sirve como TENDENCIA/eficiencia, no como conversión exacta.
 */
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useGa4Daily, useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP, PRIMARY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function WebConversionCard({ delay }) {
  const { data: ga = [] } = useGa4Daily();
  const { data: rev = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  // Revenue diario indexado por día
  const revByDay = {};
  for (const r of rev) {
    const k = `${r.year}-${r.month}-${r.day}`;
    if (!revByDay[k]) revByDay[k] = { orders: 0, revenue: 0 };
    revByDay[k].orders += r.purchases || 0;
    revByDay[k].revenue += r.revenue || 0;
  }

  const rows = [...ga]
    .filter(g => (g.year * 12 + g.month) <= cutoff && Number(g.sessions) > 0)
    .sort((a, b) => ((a.date_str || "") < (b.date_str || "") ? -1 : 1))
    .map(g => {
      const k = `${g.year}-${g.month}-${g.day}`;
      const d = revByDay[k] || { orders: 0, revenue: 0 };
      const sessions = Number(g.sessions) || 0;
      return {
        name: `${g.day} ${M[g.month]}`,
        sessions, orders: d.orders, revenue: d.revenue,
        convper100: sessions ? (d.orders / sessions) * 100 : 0,
      };
    })
    .slice(-60);

  const hasData = rows.length >= 5;

  if (!hasData) {
    return (
      <EvidenceCard sources={["connectif", "ga4"]}
        question="¿Convierte el tráfico web?"
        answer="Pendiente de datos de GA4"
        answerTone="neutral"
        context="Se cruza sesiones (GA4) con pedidos/revenue (Connectif); necesita histórico de GA4."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma que ga4_daily se está poblando (sync de GA4)." }]}
        delay={delay}
        note="Fuente: GA4 · ga4_daily (sesiones) + Connectif · daily_revenue (pedidos, revenue)."
      />
    );
  }

  const sumSes = rows.reduce((s, r) => s + r.sessions, 0);
  const sumOrd = rows.reduce((s, r) => s + r.orders, 0);
  const sumRev = rows.reduce((s, r) => s + r.revenue, 0);
  const convPer100 = sumSes ? (sumOrd / sumSes) * 100 : 0;
  const rps = sumSes ? sumRev / sumSes : 0;
  const win = `${rows[0].name}–${rows[rows.length - 1].name}`;

  return (
    <EvidenceCard sources={["connectif", "ga4"]}
      question="¿Convierte el tráfico web?"
      kpis={[
        { value: convPer100.toFixed(1), label: "Pedidos / 100 sesiones" },
        { value: `€${rps.toFixed(2)}`, label: "Revenue por sesión" },
      ]}
      maturity="green"
      insight={`Sobre ${win}: cada 100 sesiones generan ~${convPer100.toFixed(1)} pedidos y ${fmtCurrency(rps)} por sesión. Si el tráfico sube pero esta línea baja, el problema es de conversión, no de captación.`}
      actions={[
        { verb: "investigar", rationale: "Si la conversión cae con tráfico estable, revisa velocidad, ficha de producto y checkout; si sube, escala la captación que funciona." },
      ]}
      delay={delay}
      note="Aproximación: sesiones = web (GA4 · ga4_daily); pedidos y revenue = todos los canales (Connectif · daily_revenue). Útil como tendencia y eficiencia, no como conversión exacta del checkout (incluye pedidos no-web). Últimos 60 días con dato de GA4."
    >
      <div className={CHART_H}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(rows.length / 8))} />
            <YAxis {...AXIS} tickFormatter={(v) => v.toFixed(1)} />
            <Tooltip {...TIP} formatter={(v) => [`${Number(v).toFixed(2)} pedidos/100 ses.`, "Conversión"]} />
            <Line type="monotone" dataKey="convper100" name="Pedidos/100 sesiones" stroke={PRIMARY} strokeWidth={2.2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
