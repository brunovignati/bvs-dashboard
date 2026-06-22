import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMonthlyMetrics, useCompradores } from "@/lib/useEntities";
import { monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const NUTRA_COLOR = "hsl(217,91%,60%)";
const VET_COLOR   = "hsl(160,84%,39%)";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">€{Number(p.value).toLocaleString('es-ES')}</span>
        </div>
      ))}
    </div>
  );
};

function sortByYearMonth(arr) {
  return [...arr].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
}

export default function RevenueChart() {
  const { data: metrics     = [] } = useMonthlyMetrics(); // Nutracéuticos
  const { data: compradores = [] } = useCompradores();    // BVS Vet Shop

  const sortedNutra = sortByYearMonth(metrics);
  const sortedVet   = sortByYearMonth(compradores);

  // Construir mapa unificado por año-mes
  const allKeys = new Set([
    ...sortedNutra.map(d => `${d.year}-${d.month}`),
    ...sortedVet.map(d => `${d.year}-${d.month}`),
  ]);

  const nutraMap = Object.fromEntries(sortedNutra.map(d => [`${d.year}-${d.month}`, d]));
  const vetMap   = Object.fromEntries(sortedVet.map(d => [`${d.year}-${d.month}`, d]));

  const chartData = [...allKeys]
    .sort()
    .map(key => {
      const [year, month] = key.split('-').map(Number);
      return {
        name:         `${monthLabel(month)} ${String(year).slice(2)}`,
        Nutracéuticos: nutraMap[key]?.revenue   ?? null,
        'Vet Shop':    vetMap[key]?.revenue      ?? null,
      };
    });

  const firstDateNutra = sortedNutra[0];
  const lastDateNutra  = sortedNutra[sortedNutra.length - 1];
  const subtitle = firstDateNutra && lastDateNutra
    ? `${monthLabel(firstDateNutra.month)} ${firstDateNutra.year} – ${monthLabel(lastDateNutra.month)} ${lastDateNutra.year} · ${sortedNutra.length} meses Nutracéuticos · ${sortedVet.length} meses Vet Shop`
    : 'Datos en tiempo real';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Evolución Revenue por Marca"
        subtitle={subtitle}
        icon={TrendingUp}
      />
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }}
              axisLine={false}
              tickLine={false}
              interval={Math.floor(chartData.length / 8)}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="Nutracéuticos"
              stroke={NUTRA_COLOR}
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: NUTRA_COLOR }}
              connectNulls={false}
            />
            <Line
              type="monotone"
              dataKey="Vet Shop"
              stroke={VET_COLOR}
              strokeWidth={2.5}
              dot={{ r: 2.5, fill: VET_COLOR }}
              connectNulls={false}
              strokeDasharray="6 3"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Nutracéuticos: revenue mensual total · Vet Shop: revenue atribuido a compradores del mes
      </p>
    </motion.div>
  );
}
