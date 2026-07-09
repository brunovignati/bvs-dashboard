import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from "recharts";
import { useChannelSegmentation } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Store } from "lucide-react";
import { motion } from "framer-motion";

const CHANNELS = [
  { key: "retail",      label: "Retail",    color: "hsl(221,83%,53%)" },
  { key: "digital",     label: "Digital",   color: "hsl(214,95%,68%)" },
  { key: "omnichannel", label: "Omnicanal", color: "hsl(214,95%,68%)" },
];

const MONTH_LABELS = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

export default function ChannelSegmentation() {
  const { data: rows = [] } = useChannelSegmentation();
  const { filterByPeriod, periodEnd } = useComparison();

  const periodRows = filterByPeriod(rows).sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
  const activeRows = periodRows.length > 0 ? periodRows : rows;

  // ── Snapshot del extremo final del período (periodEnd) ───────────────────
  const latest = activeRows.length
    ? activeRows.find(r => r.year === periodEnd.year && r.month === periodEnd.month)
      ?? activeRows.reduce((best, r) =>
          r.year * 12 + r.month > best.year * 12 + best.month ? r : best
        , activeRows[0])
    : null;

  const retail      = latest?.retail      ?? 0;
  const digital     = latest?.digital     ?? 0;
  const omnichannel = latest?.omnichannel ?? 0;
  const total       = latest?.total_buyers ?? retail + digital + omnichannel;
  const hasData     = total > 0;

  // ── Datos para donut ────────────────────────────────────────────────────
  const pieData = CHANNELS.map(ch => ({
    name:  ch.label,
    value: latest?.[ch.key] ?? 0,
    color: ch.color,
    pct:   total > 0
      ? (((latest?.[ch.key] ?? 0) / total) * 100).toFixed(1)
      : "0.0",
  }));

  // ── Datos para sparkline mensual (rango seleccionado, máx 18 meses) ─────
  const trend = activeRows
    .slice(-18)
    .map(r => ({
      label:      `${MONTH_LABELS[r.month - 1]} ${String(r.year).slice(2)}`,
      retail:     r.retail,
      digital:    r.digital,
      omnichannel: r.omnichannel,
    }));

  // ── Insight automático ───────────────────────────────────────────────────
  const dominantChannel = pieData.reduce((a, b) => (a.value > b.value ? a : b), pieData[0]);
  const insightText = hasData
    ? `De ${fmtNumber(total)} compradores únicos: ${pieData[0].pct}% solo en tienda física (Retail), `
      + `${pieData[1].pct}% solo online (Digital) y ${pieData[2].pct}% en ambos canales (Omnicanal). `
      + `El canal dominante es ${dominantChannel.name} con ${fmtNumber(dominantChannel.value)} compradores.`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Segmentación por Canal de Compra"
        subtitle="Retail · Digital · Omnicanal — compradores únicos por mes"
        icon={Store}
        badge="Canales"
      />

      {/* KPI cards */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        {CHANNELS.map((ch, i) => {
          const val = latest?.[ch.key] ?? 0;
          return (
            <motion.div
              key={ch.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
              className="rounded-xl p-3 text-center"
              style={{ backgroundColor: `${ch.color}18` }}
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                {ch.label}
              </p>
              <p className="text-xl font-bold font-heading" style={{ color: ch.color }}>
                {hasData ? fmtNumber(val) : "—"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {hasData ? `${total > 0 ? ((val / total) * 100).toFixed(1) : "0.0"}%` : "—"}
              </p>
            </motion.div>
          );
        })}
      </div>

      {/* Donut chart */}
      {hasData ? (
        <div className="h-52 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={85}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-card/95 border border-border rounded-xl p-3 shadow-xl text-xs">
                      <p className="font-semibold mb-1">{d.name}</p>
                      <p className="text-muted-foreground">{fmtNumber(d.value)} compradores únicos</p>
                      <p className="font-mono font-medium">{d.pct}% del total</p>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 10 }}
                formatter={(v) => (
                  <span style={{ color: "hsl(220,10%,50%)" }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Sin datos — crea el reporte "V! Compradores por Origen" en Connectif Data Explorer
          </p>
        </div>
      )}

      {/* Sparkline de tendencia mensual */}
      {trend.length > 1 && (
        <div className="mt-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
            Evolución mensual
          </p>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,10%,20%)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(220,10%,10%)",
                    border: "1px solid hsl(220,10%,20%)",
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  formatter={(v, name) => [fmtNumber(v), name]}
                />
                {CHANNELS.map(ch => (
                  <Line
                    key={ch.key}
                    type="monotone"
                    dataKey={ch.key}
                    name={ch.label}
                    stroke={ch.color}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-3">
        {hasData && insightText ? (
          <InsightCard
            type="info"
            title="Distribución de compradores por canal"
            description={insightText}
          />
        ) : (
          <InsightCard
            type="info"
            title="Configuración pendiente en Connectif"
            description={
              "Paso único: (1) Elimina un reporte existente del Data Explorer (límite 20/20). "
              + "(2) Crea 'V! Compradores por Origen': Group by Year · Month · Purchase Origin, "
              + "Metric: Number of buyers, schedule diario. El pipeline carga el histórico automáticamente."
            }
          />
        )}
      </div>
    </motion.div>
  );
}
