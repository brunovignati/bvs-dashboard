import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useBuyerCohorts, useCompradores } from "@/lib/useEntities";
import { monthLabel, fmtNumber, fmtCurrency } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Users, Package } from "lucide-react";
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
      {total > 0 && payload.length === 2 && (
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
  const { data: compradores  = [] } = useCompradores();

  // ── Cohortes primerizos vs recurrentes ──────────────────────
  const sortedCohorts = [...buyerCohorts].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
  const cohortData = sortedCohorts.map(d => ({
    name:        `${monthLabel(d.month)} ${d.year}`,
    Primerizos:  d.firstTime || 0,
    Recurrentes: d.recurring || 0,
    recurringPct: (d.firstTime || 0) + (d.recurring || 0) > 0
      ? (((d.recurring || 0) / ((d.firstTime || 0) + (d.recurring || 0))) * 100).toFixed(1)
      : '0',
  }));

  const avgRecurring   = cohortData.length > 0
    ? cohortData.reduce((s, d) => s + parseFloat(d.recurringPct), 0) / cohortData.length : 0;
  const latestPct      = cohortData.length > 0 ? parseFloat(cohortData[cohortData.length - 1].recurringPct) : 0;
  const firstPct       = cohortData.length > 0 ? parseFloat(cohortData[0].recurringPct) : 0;
  const trendDir       = latestPct >= firstPct ? "mejorando" : "decayendo";

  const cohortFirst = sortedCohorts[0];
  const cohortLast  = sortedCohorts[sortedCohorts.length - 1];
  const subtitle = cohortFirst && cohortLast
    ? `${monthLabel(cohortFirst.month)} ${cohortFirst.year} – ${monthLabel(cohortLast.month)} ${cohortLast.year} · ${sortedCohorts.length} meses · Ambas marcas`
    : 'Primerizos vs Recurrentes';

  // ── BVS Vet Shop — evolución compradores ───────────────────
  const sortedComp = [...compradores].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
  const compData = sortedComp.map(d => ({
    name:        `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
    Compradores: d.buyers   || 0,
    Revenue:     d.revenue  || 0,
    TicketMedio: d.buyers > 0 ? Math.round((d.revenue || 0) / d.buyers) : 0,
  }));

  const totalCompBuyers  = sortedComp.reduce((s, d) => s + (d.buyers  || 0), 0);
  const totalCompRevenue = sortedComp.reduce((s, d) => s + (d.revenue || 0), 0);

  if (cohortData.length === 0 && compradores.length === 0) return null;

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

      {/* Área apilada: primerizos vs recurrentes */}
      {cohortData.length > 0 && (
        <>
          <div className="h-56 mb-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cohortData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {cohortData.slice(-4).map((d, i) => (
              <div key={i} className="text-center p-3 bg-muted/50 rounded-xl">
                <p className="text-[10px] text-muted-foreground">{d.name}</p>
                <p className="text-lg font-bold font-heading">{d.recurringPct}%</p>
                <p className="text-[10px] text-muted-foreground">recurrencia</p>
              </div>
            ))}
          </div>
        </>
      )}

      {/* BVS Vet Shop — evolución compradores */}
      {compData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5" />
              BVS Vet Shop — Evolución Compradores
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total: <span className="font-semibold text-foreground">{fmtNumber(totalCompBuyers)}</span> compradores</span>
              <span>Revenue: <span className="font-semibold text-foreground">{fmtCurrency(totalCompRevenue)}</span></span>
            </div>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={compData} margin={{ top: 5, right: 40, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} interval={1} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip formatter={(v, name) => name === 'Ticket Medio' ? `€${v}` : fmtNumber(v)} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                <Line yAxisId="left"  type="monotone" dataKey="Compradores" stroke="hsl(280,65%,60%)" strokeWidth={2} dot={{ r: 3 }} />
                <Line yAxisId="right" type="monotone" dataKey="TicketMedio" name="Ticket Medio" stroke="hsl(35,92%,56%)" strokeWidth={1.5} strokeDasharray="4 3" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="mt-4">
        <InsightCard
          type={latestPct > 75 ? "success" : "warning"}
          title="Retención de Clientes — Ambas Marcas"
          description={`Recurrencia media: ${avgRecurring.toFixed(1)}% — tendencia ${trendDir} (de ${firstPct}% a ${latestPct}%). Una recurrencia >75% indica una base de clientes muy leal. BVS Vet Shop acumula ${fmtNumber(totalCompBuyers)} compradores en el período con un revenue total de ${fmtCurrency(totalCompRevenue)}.`}
        />
      </div>
    </motion.div>
  );
}
