import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useMonthlyMetrics, useCompradores } from "@/lib/useEntities";
import { monthLabel, fmtCurrency } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import { TrendingUp } from "lucide-react";
import { motion } from "framer-motion";

const NUTRA_COLOR = "hsl(217,91%,60%)";
const VET_COLOR   = "hsl(160,84%,39%)";
const TICKET_COLOR = "hsl(35,92%,56%)";

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
            {p.name === 'Ticket Medio' ? `€${Number(p.value).toFixed(0)}` : `€${Number(p.value).toLocaleString('es-ES')}`}
          </span>
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

  // Mapa unificado por año-mes
  const allKeys  = new Set([
    ...sortedNutra.map(d => `${d.year}-${d.month}`),
    ...sortedVet.map(d   => `${d.year}-${d.month}`),
  ]);
  const nutraMap = Object.fromEntries(sortedNutra.map(d => [`${d.year}-${d.month}`, d]));
  const vetMap   = Object.fromEntries(sortedVet.map(d   => [`${d.year}-${d.month}`, d]));

  const chartData = [...allKeys].sort().map(key => {
    const [year, month] = key.split('-').map(Number);
    const n = nutraMap[key];
    return {
      name:          `${monthLabel(month)} ${String(year).slice(2)}`,
      Nutracéuticos: n?.revenue      ?? null,
      'Vet Shop':    vetMap[key]?.revenue ?? null,
      TicketMedio:   n?.avgPurchase  ?? null,
      EmailAttr:     n ? Math.round((n.emailAttr || 0) * (n.avgPurchase || 0)) : null,
      PushAttr:      n ? Math.round((n.pushAttr  || 0) * (n.avgPurchase || 0)) : null,
      WebAttr:       n ? Math.round((n.webAttr   || 0) * (n.avgPurchase || 0)) : null,
    };
  });

  // Ticket medio trend (Nutracéuticos)
  const tickets     = sortedNutra.map(d => d.avgPurchase || 0).filter(v => v > 0);
  const lastTicket  = tickets[tickets.length - 1] || 0;
  const firstTicket = tickets[0] || 0;
  const ticketTrend = firstTicket > 0 ? (((lastTicket - firstTicket) / firstTicket) * 100).toFixed(1) : null;

  const firstNutra = sortedNutra[0];
  const lastNutra  = sortedNutra[sortedNutra.length - 1];
  const subtitle = firstNutra && lastNutra
    ? `${monthLabel(firstNutra.month)} ${firstNutra.year} – ${monthLabel(lastNutra.month)} ${lastNutra.year} · ${sortedNutra.length} meses Nutracéuticos · ${sortedVet.length} meses Vet Shop`
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

      {/* KPIs de ticket medio */}
      {ticketTrend !== null && (
        <div className="mb-3 flex gap-4">
          <div className="text-xs text-muted-foreground">
            Ticket medio actual (Nutracéuticos):
            <span className="font-mono font-semibold text-foreground ml-1">€{lastTicket.toFixed(0)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Variación histórica:
            <span className={`font-mono font-semibold ml-1 ${parseFloat(ticketTrend) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
              {parseFloat(ticketTrend) >= 0 ? '+' : ''}{ticketTrend}%
            </span>
          </div>
        </div>
      )}

      {/* Gráfico principal: Revenue por marca + Ticket Medio */}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 5, right: 40, left: 10, bottom: 0 }}>
            <defs>
              <linearGradient id="nutraGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={NUTRA_COLOR} stopOpacity={0.25} />
                <stop offset="95%" stopColor={NUTRA_COLOR} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
              interval={Math.max(1, Math.floor(chartData.length / 8))} />
            <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `€${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Area yAxisId="left" type="monotone" dataKey="Nutracéuticos"
              stroke={NUTRA_COLOR} fill="url(#nutraGrad)" strokeWidth={2.5}
              dot={{ r: 2, fill: NUTRA_COLOR }} connectNulls={false} />
            <Line yAxisId="left" type="monotone" dataKey="Vet Shop"
              stroke={VET_COLOR} strokeWidth={2} dot={{ r: 2.5, fill: VET_COLOR }}
              strokeDasharray="6 3" connectNulls={false} />
            <Line yAxisId="right" type="monotone" dataKey="TicketMedio" name="Ticket Medio"
              stroke={TICKET_COLOR} strokeWidth={1.5} dot={{ r: 2, fill: TICKET_COLOR }}
              strokeDasharray="3 3" connectNulls={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Gráfico secundario: Revenue atribuido por canal */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Revenue atribuido por canal — Nutracéuticos (estimado last-touch)
        </p>
        <div className="h-32">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 0, right: 40, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                interval={Math.max(2, Math.floor(chartData.length / 6))} />
              <YAxis tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
              <Tooltip formatter={(v, name) => [`€${Number(v).toLocaleString('es-ES')}`, name]} />
              <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="EmailAttr" name="Email"       stackId="a" fill={NUTRA_COLOR} radius={[0,0,0,0]} />
              <Bar dataKey="PushAttr"  name="Push"        stackId="a" fill="hsl(280,65%,60%)" radius={[0,0,0,0]} />
              <Bar dataKey="WebAttr"   name="Web Content" stackId="a" fill={VET_COLOR} radius={[4,4,0,0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">
          Estimado = compras atribuidas × ticket medio. Son subconjuntos del revenue total, no aditivos.
        </p>
      </div>
    </motion.div>
  );
}
