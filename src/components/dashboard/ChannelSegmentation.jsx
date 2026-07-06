import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSegments } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Store } from "lucide-react";
import { motion } from "framer-motion";

const CHANNEL_SEGMENTS = [
  { key: "v! Clientes TIENDA FÍSICA",         label: "Retail",    color: "hsl(217,91%,60%)" },
  { key: "v! Clientes TIENDA ONLINE",          label: "Digital",   color: "hsl(160,84%,39%)" },
  { key: "v! Clientes TIENDA FÍSICA Y ONLINE", label: "Omnicanal", color: "hsl(280,65%,60%)" },
];

export default function ChannelSegmentation() {
  const { data: segments = [] } = useSegments();

  const latestByKey = {};
  for (const s of segments) {
    const ch = CHANNEL_SEGMENTS.find(c => c.key === s.segment);
    if (!ch) continue;
    const existing = latestByKey[ch.key];
    if (!existing || s.year * 12 + s.month > existing.year * 12 + existing.month) {
      latestByKey[ch.key] = s;
    }
  }

  const channelData = CHANNEL_SEGMENTS.map(ch => ({
    ...ch,
    contacts: latestByKey[ch.key]?.contacts ?? 0,
  }));

  const total = channelData.reduce((sum, c) => sum + c.contacts, 0);
  const hasData = total > 0;

  const pieData = channelData.map(c => ({
    name: c.label,
    value: c.contacts,
    color: c.color,
    pct: total > 0 ? ((c.contacts / total) * 100).toFixed(1) : "0.0",
  }));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Segmentación por Canal de Compra"
        subtitle="Retail · Digital · Omnicanal — datos desde Connectif"
        icon={Store}
        badge="Canales"
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        {channelData.map((c, i) => (
          <motion.div
            key={c.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.1 }}
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: `${c.color}18` }}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{c.label}</p>
            <p className="text-xl font-bold font-heading" style={{ color: c.color }}>
              {hasData ? fmtNumber(c.contacts) : "—"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {hasData ? `${((c.contacts / total) * 100).toFixed(1)}%` : "—"}
            </p>
          </motion.div>
        ))}
      </div>

      {hasData ? (
        <div className="h-52 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
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
                      <p className="text-muted-foreground">{fmtNumber(d.value)} contactos</p>
                      <p className="font-mono font-medium">{d.pct}% del total</p>
                    </div>
                  );
                }}
              />
              <Legend wrapperStyle={{ fontSize: 10 }} formatter={(v) => <span style={{ color: "hsl(220,10%,50%)" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Sin datos disponibles</p>
        </div>
      )}

      <div className="mt-2">
        {hasData ? (
          <InsightCard
            type="info"
            title="Distribución de clientes por canal"
            description={`De ${fmtNumber(total)} clientes: ${pieData[0].pct}% compran solo en tienda física (Retail), ${pieData[1].pct}% solo online (Digital) y ${pieData[2].pct}% usan ambos canales (Omnicanal).`}
          />
        ) : (
          <InsightCard
            type="info"
            title="Segmentos de canal pendientes de configuración en Connectif"
            description="Los segmentos Retail / Digital / Omnicanal se sincronizan correctamente desde Connectif. Actualmente muestran 0 contactos porque las reglas de membresía están pendientes de configurar en Connectif."
          />
        )}
      </div>
    </motion.div>
  );
}
