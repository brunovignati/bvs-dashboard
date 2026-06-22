import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useBuyerCohorts } from "@/lib/useEntities";
import { monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Users } from "lucide-react";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (p.value || 0), 0);
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{Number(p.value).toLocaleString('es-ES')}</span>
        </div>
      ))}
      {total > 0 && (
        <div className="border-t border-border mt-1.5 pt-1.5 text-xs text-muted-foreground">
          Recurrencia: <span className="font-semibold text-foreground">
            {((payload.find(p => p.dataKey === 'Recurrentes')?.value || 0) / total * 100).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default function CohortAnalysis() {
  const { data: buyerCohorts = [] } = useBuyerCohorts();
  const sorted = [...buyerCohorts].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  const data = sorted.map(d => ({
    name:         `${monthLabel(d.month)} ${d.year}`,
    Primerizos:   d.firstTime  || 0,
    Recurrentes:  d.recurring  || 0,
    total:        (d.firstTime || 0) + (d.recurring || 0),
    recurringPct: d.firstTime + d.recurring > 0
      ? ((d.recurring / (d.firstTime + d.recurring)) * 100).toFixed(1)
      : '0',
  }));

  if (data.length === 0) return null;

  const avgRecurring    = data.reduce((s, d) => s + parseFloat(d.recurringPct), 0) / data.length;
  const latestPct       = parseFloat(data[data.length - 1].recurringPct);
  const firstPct        = parseFloat(data[0].recurringPct);
  const trendDirection  = latestPct > firstPct ? "mejorando" : latestPct < firstPct ? "decayendo" : "estable";

  const first = sorted[0];
  const last  = sorted[sorted.length - 1];
  const subtitle = first && last
    ? `${monthLabel(first.month)} ${first.year} – ${monthLabel(last.month)} ${last.year} · ${sorted.length} meses · Ambas marcas`
    : 'Primerizos vs Recurrentes';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Análisis de Cohortes"
        subtitle={subtitle}
        icon={Users}
        badge="Cohorte"
      />

      <div className="h-64 mb-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="priGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(217,91%,60%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="recGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(160,84%,39%)" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="Primerizos"  stackId="a" stroke="hsl(217,91%,60%)" fill="url(#priGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="Recurrentes" stackId="a" stroke="hsl(160,84%,39%)" fill="url(#recGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {data.slice(-4).map((d, i) => (
          <div key={i} className="text-center p-3 bg-muted/50 rounded-xl">
            <p className="text-xs text-muted-foreground">{d.name}</p>
            <p className="text-lg font-bold font-heading">{d.recurringPct}%</p>
            <p className="text-[10px] text-muted-foreground">recurrencia</p>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <InsightCard
          type={latestPct > 75 ? "success" : "warning"}
          title="Retención de Clientes"
          description={`Recurrencia media: ${avgRecurring.toFixed(1)}% — tendencia ${trendDirection} (de ${firstPct}% a ${latestPct}%). Una recurrencia >75% indica base de clientes muy leal. El área apilada muestra cómo crece el total de compradores mes a mes.`}
        />
      </div>
    </motion.div>
  );
}
