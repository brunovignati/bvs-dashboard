/**
 * Ga4ChannelFunnelCard (Marketing) — ¿qué canal de tráfico convierte mejor?
 * Usa ga4_channel_daily (GA4 · sessionDefaultChannelGroup): sesiones, carrito, checkout,
 * compra y revenue POR CANAL (orgánico/pago/email/social/directo/referral).
 * Comparación RELATIVA entre canales (GA4 mide comportamiento; la caja real total vive en el
 * embudo del sitio con PrestaShop). Respeta el periodo del comparador.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useGa4ChannelDaily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";

const clip = (s, n) => { s = String(s || "").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };

export default function Ga4ChannelFunnelCard({ delay }) {
  const { data = [] } = useGa4ChannelDaily();
  const { rangeB, inRange, labelRange } = useComparison();

  const rows = data.filter(r => inRange(rangeB, r));
  const byCh = {};
  for (const r of rows) {
    const k = (r.channel || "(sin canal)");
    (byCh[k] ||= { channel: k, sessions: 0, carts: 0, checkouts: 0, purchases: 0, revenue: 0 });
    byCh[k].sessions += Number(r.sessions) || 0;
    byCh[k].carts += Number(r.add_to_carts) || 0;
    byCh[k].checkouts += Number(r.checkouts) || 0;
    byCh[k].purchases += Number(r.ecommerce_purchases) || 0;
    byCh[k].revenue += Number(r.purchase_revenue) || 0;
  }
  const chans = Object.values(byCh).filter(c => c.sessions > 0)
    .map(c => ({ ...c, name: clip(c.channel, 20), conv: c.sessions ? (c.purchases / c.sessions) * 100 : 0 }))
    .sort((a, b) => b.sessions - a.sessions);
  const hasData = chans.length >= 1 && chans.some(c => c.purchases > 0);

  if (!hasData) {
    return (
      <EvidenceCard sources={["ga4"]}
        question="¿Qué canal de tráfico convierte mejor?"
        answer="Se enciende con el dato"
        answerTone="neutral"
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Requiere la tabla ga4_channel_daily poblada: crear la tabla (supabase/create_ga4_channel_daily.sql) y correr el sync de GA4 con la dimensión de canal. Se enciende sola tras el próximo sync." }]}
        delay={delay}
        note="Fuente: GA4 · ga4_channel_daily (sessionDefaultChannelGroup). Pendiente del primer sync con la dimensión de canal." />
    );
  }

  const topSes = chans[0].sessions;
  const eligible = chans.filter(c => c.sessions >= topSes * 0.05 && c.purchases > 0);
  const leader = [...eligible].sort((a, b) => b.conv - a.conv)[0] || chans[0];
  const convRows = [...chans].sort((a, b) => b.conv - a.conv).slice(0, 8);
  const volRows = chans.slice(0, 8);
  const totalSes = chans.reduce((s, c) => s + c.sessions, 0);

  const chart = (rowsIn, dataKey, fmt, label, highlightName) => (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rowsIn} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={fmt} />
          <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
          <Tooltip labelFormatter={(l, p) => p?.[0]?.payload?.channel || l}
            formatter={(v, n, p) => [`${label}: ${dataKey === "conv" ? Number(v).toFixed(2) + "%" : fmtNumber(v)} · ${fmtNumber(p.payload.sessions)} ses · ${fmtCurrency(p.payload.revenue)}`, ""]}
            labelStyle={{ fontSize: 10 }} />
          <Bar dataKey={dataKey} radius={[0, 4, 4, 0]}>
            {rowsIn.map((c, i) => <Cell key={i} fill={c.channel === highlightName ? "hsl(30,72%,66%)" : "hsl(16,79%,57%)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );

  const altView = chart(volRows, "sessions", v => fmtNumber(v), "Sesiones", chans[0].channel);

  return (
    <EvidenceCard sources={["ga4"]}
      question="¿Qué canal de tráfico convierte mejor?"
      answer={`${leader.channel} · ${leader.conv.toFixed(1)}%`}
      answerTone="good"
      context={`Conversión (compra/sesión, GA4) por canal · ${labelRange(rangeB)}. ${chans[0].channel} trae más tráfico (${((chans[0].sessions / totalSes) * 100).toFixed(0)}% de ${fmtNumber(totalSes)} sesiones). Comparación relativa entre canales.`}
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: `«${leader.channel}» es el canal que más convierte (${leader.conv.toFixed(1)}%). Prioriza inversión/contenido ahí si hay margen de volumen.` },
        { verb: "investigar", rationale: "Un canal con mucho tráfico y conversión baja es una fuga: revisa la landing, la intención de la fuente y la relevancia de la oferta." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Conversión", b: "Volumen" }}
      note="Fuente: GA4 · ga4_channel_daily (sessionDefaultChannelGroup): sesiones, carrito, checkout, compra y revenue por canal. Conversión = compra/sesión (comportamiento GA4; infra-cuenta compras absolutas pero es válida para comparar canales entre sí). El cierre real por canal requeriría atribución de PrestaShop (no disponible hoy). Vista 'Volumen' = sesiones por canal."
    >
      {chart(convRows, "conv", v => `${v.toFixed(0)}%`, "Conversión", leader.channel)}
    </EvidenceCard>
  );
}
