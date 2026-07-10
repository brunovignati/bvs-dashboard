import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Line } from "recharts";
import { useEnvios } from "@/lib/useEntities";
import { fmtCurrency } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Calendar } from "lucide-react";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">
            {typeof p.value === 'number' ? p.value.toLocaleString('es-ES') : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function DayOfWeekAnalysis() {
  // ✅ MIGRADO: datos reales de Supabase
  const { data: enviosData = [] } = useEnvios();

  const data = [...enviosData]
    .sort((a, b) => (a.dayOfWeek || a.day_of_week || 0) - (b.dayOfWeek || b.day_of_week || 0))
    .map(d => ({
      ...d,
      name:               d.dayName || d.day_name || `Día ${d.dayOfWeek || d.day_of_week}`,
      convRate:           d.sent > 0 ? ((d.purchases || 0) / d.sent * 100) : 0,
      revenuePerPurchase: (d.purchases || 0) > 0 ? (d.revenue || 0) / d.purchases : 0,
    }));

  const bestDay    = data.length > 0 ? [...data].sort((a, b) => (b.purchases || 0) - (a.purchases || 0))[0] : null;
  const worstDay   = data.length > 0 ? [...data].sort((a, b) => (a.purchases || 0) - (b.purchases || 0))[0] : null;
  const bestConvDay = data.length > 0 ? [...data].sort((a, b) => b.convRate - a.convRate)[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="¿Cuándo compran tus clientes?"
        subtitle="Revenue y compras por día de la semana · Nutracéuticos BVS"
        icon={Calendar}
        badge="Temporal"
      />

      {data.length === 0 ? (
        <p className="text-muted-foreground text-sm">Cargando datos...</p>
      ) : (
        <>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left"  tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar yAxisId="left"  dataKey="sent"      name="Enviados" fill="hsl(220,13%,85%)" radius={[4,4,0,0]} />
                <Bar yAxisId="right" dataKey="purchases" name="Compras"  fill="hsl(221,83%,53%)" radius={[4,4,0,0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue" stroke="hsl(220,55%,62%)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-4">
            <InsightCard
              type="info"
              title="Cuándo enviar para vender más"
              description={
                bestDay && worstDay && bestConvDay
                  ? `${bestDay.name} concentra el mayor volumen de compras (${(bestDay.purchases || 0).toLocaleString('es-ES')}). La mejor tasa de conversión es el ${bestConvDay.name} (${bestConvDay.convRate.toFixed(2)}% de emails que generan compra). Recomendación: programa los envíos de email el día anterior al de mayor compra — así el cliente tiene el email en bandeja de entrada cuando está listo para comprar.`
                  : 'Analiza el patrón semanal para optimizar el día de envío.'
              }
            />
          </div>
        </>
      )}
    </motion.div>
  );
}
