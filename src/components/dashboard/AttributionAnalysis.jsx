import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { monthLabel, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { GitBranch, Info } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ["hsl(217,91%,60%)", "hsl(280,65%,60%)", "hsl(160,84%,39%)"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{Number(p.value).toLocaleString('es-ES')} compras</span>
        </div>
      ))}
    </div>
  );
};

export default function AttributionAnalysis() {
  const { periodA, periodB } = useComparison();
  const { data: rawMetrics = [] } = useMonthlyMetrics();

  // Filtrar por rango de periodos
  const startYM = Math.min(periodA.year * 12 + periodA.month, periodB.year * 12 + periodB.month);
  const endYM   = Math.max(periodA.year * 12 + periodA.month, periodB.year * 12 + periodB.month);
  const data = [...rawMetrics]
    .filter(d => { const ym = d.year * 12 + d.month; return ym >= startYM && ym <= endYM; })
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  if (data.length === 0) return null;

  const pA = periodA.year * 12 + periodA.month <= periodB.year * 12 + periodB.month ? periodA : periodB;
  const pB = periodA.year * 12 + periodA.month <= periodB.year * 12 + periodB.month ? periodB : periodA;
  const rangeLabel = pA.year === pB.year && pA.month === pB.month
    ? `${monthLabel(pA.month)} ${pA.year}`
    : `${monthLabel(pA.month)} ${pA.year} → ${monthLabel(pB.month)} ${pB.year} · ${data.length} meses`;

  const chartData = data.map(d => ({
    name: `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
    Email: d.emailAttr || 0,
    Web:   d.webAttr   || 0,
    Push:  d.pushAttr  || 0,
  }));

  const totEmail = data.reduce((s, d) => s + (d.emailAttr || 0), 0);
  const totWeb   = data.reduce((s, d) => s + (d.webAttr   || 0), 0);
  const totPush  = data.reduce((s, d) => s + (d.pushAttr  || 0), 0);
  const totAll   = totEmail + totWeb + totPush;

  const barData = [
    { canal: 'Email',       compras: totEmail, color: COLORS[0] },
    { canal: 'Web Content', compras: totWeb,   color: COLORS[2] },
    { canal: 'Push',        compras: totPush,  color: COLORS[1] },
  ].filter(d => d.compras > 0).sort((a, b) => b.compras - a.compras);

  const topChannel = barData[0] || null;
  const firstHalf  = data.slice(0, Math.max(1, Math.floor(data.length / 2)));
  const lastHalf   = data.slice(-Math.max(1, Math.floor(data.length / 2)));
  const emailFirst = firstHalf.reduce((s, d) => s + (d.emailAttr || 0), 0) / firstHalf.length;
  const emailLast  = lastHalf.reduce((s, d)  => s + (d.emailAttr || 0), 0) / lastHalf.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Atribución Multicanal"
        subtitle={`Nutracéuticos BVS · ${rangeLabel} · Compras por canal (last-touch)`}
        icon={GitBranch}
        badge="Last-touch"
      />

      {/* Nota de caveat */}
      <div className="flex items-start gap-2 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Modelo last-touch:</span> Connectif asigna cada compra al último canal contactado. Los canales son <em>mutuamente excluyentes</em> — no representan revenue adicional, sino cuál canal "cerró" la venta.
        </p>
      </div>

      {/* Evolución mensual (líneas) */}
      {chartData.length > 1 && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Evolución mensual de compras por canal</p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(chartData.length / 8))} />
                <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Email" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Web"   stroke={COLORS[2]} strokeWidth={2} dot={{ r: 2 }} />
                <Line type="monotone" dataKey="Push"  stroke={COLORS[1]} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Funnel de atribución — barras por canal */}
      {totAll > 0 && (
        <div className="pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Funnel de atribución — compras por último canal de contacto
          </p>

          {/* Barra horizontal por canal */}
          <div className="space-y-3 mb-4">
            {[
              { name: "Total atribuido", value: totAll,   color: "hsl(220,14%,50%)", pct: 100 },
              ...barData.map(b => ({ name: b.canal, value: b.compras, color: b.color, pct: totAll > 0 ? (b.compras / totAll) * 100 : 0 })),
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-24 text-[10px] text-right text-muted-foreground shrink-0 font-medium">{item.name}</div>
                <div className="flex-1 bg-muted/40 rounded-full h-7 relative overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: Math.max(item.pct, 2) + '%' }}
                    transition={{ duration: 0.7, delay: i * 0.1 }}
                    className="h-full rounded-full flex items-center pl-3"
                    style={{ backgroundColor: item.color + (i === 0 ? '99' : 'cc') }}
                  >
                    <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                      {fmtNumber(item.value)} compras
                    </span>
                  </motion.div>
                </div>
                <div className="w-10 text-[10px] text-muted-foreground text-right shrink-0">
                  {item.pct.toFixed(0)}%
                </div>
              </div>
            ))}
          </div>

          {/* Gráfico de barras agrupadas por mes */}
          {chartData.length > 0 && (
            <div className="h-44">
              <p className="text-[10px] text-muted-foreground mb-1">Compras por canal · por mes</p>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(chartData.length / 8))} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Email" fill={COLORS[0]} radius={[2, 2, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Web"   fill={COLORS[2]} radius={[2, 2, 0, 0]} maxBarSize={20} />
                  <Bar dataKey="Push"  fill={COLORS[1]} radius={[2, 2, 0, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          <p className="text-[9px] text-muted-foreground/70 mt-2">
            Last-touch · Nutracéuticos BVS · Canales mutuamente excluyentes por compra
          </p>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type={emailLast < emailFirst ? "warning" : "success"}
          title="Tendencia Email"
          description={`La atribución por email pasó de ~${Math.round(emailFirst)} a ~${Math.round(emailLast)} compras/mes (${emailLast < emailFirst ? 'descenso' : 'aumento'} del ${emailFirst > 0 ? Math.abs(((emailLast - emailFirst) / emailFirst) * 100).toFixed(0) : 0}%).`}
        />
        <InsightCard
          type="info"
          title="Canal dominante"
          description={topChannel
            ? `${topChannel.canal} lidera con ${fmtNumber(topChannel.compras)} compras atribuidas en el período (${totAll > 0 ? ((topChannel.compras / totAll) * 100).toFixed(0) : 0}% del total). Cambia el período en el Comparador para ver si esto varía.`
            : 'Sin datos de atribución en el período seleccionado.'}
        />
      </div>
    </motion.div>
  );
}
