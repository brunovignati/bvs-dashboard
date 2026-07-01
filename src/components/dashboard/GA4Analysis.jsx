import { useMemo, useState } from "react";
import { useGa4Daily } from "@/lib/useEntities";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { LineChart as LineChartIcon, Users, Eye, MousePointerClick, ArrowUp, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────
const GA_ORANGE = "#F9AB00";
const GA_BLUE = "#4285F4";

const fmtN = v => Number(v || 0).toLocaleString("es-ES");
const fmtPct = v => `${(Number(v || 0) * 100).toFixed(1)}%`;

// % de cambio entre el período actual y el inmediatamente anterior (misma duración)
function pctDelta(current, previous) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function DeltaBadge({ delta, invert = false }) {
  if (delta === null || !Number.isFinite(delta)) return null;
  const isGood = invert ? delta <= 0 : delta >= 0;
  const Icon = delta >= 0 ? ArrowUp : ArrowDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isGood ? "text-emerald-600" : "text-rose-500"}`}>
      <Icon className="w-2.5 h-2.5" />
      {Math.abs(delta).toFixed(1)}%
    </span>
  );
}

function monthLabel(m) {
  return ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][m - 1] || m;
}

function dateStrToLabel(d) {
  if (!d || d.length < 8) return d;
  return `${d.slice(6)}/${d.slice(4, 6)}`;
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{fmtN(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

const RANGES = [
  { label: "30 días", days: 30 },
  { label: "60 días", days: 60 },
  { label: "Todo", days: 9999 },
];

// ─── Component ───────────────────────────────────────────────
export default function GA4Analysis() {
  const { data: ga4Daily = [] } = useGa4Daily();
  const [rangeDays, setRangeDays] = useState(60);

  const sortedAll = useMemo(
    () => [...ga4Daily].sort((a, b) => a.date_str.localeCompare(b.date_str)),
    [ga4Daily]
  );

  const filteredDaily = useMemo(() => {
    if (rangeDays >= 9999) return sortedAll;
    const last = sortedAll[sortedAll.length - 1];
    if (!last) return sortedAll;
    const cutDate = new Date(`${last.date_str.slice(0,4)}-${last.date_str.slice(4,6)}-${last.date_str.slice(6,8)}`);
    cutDate.setDate(cutDate.getDate() - rangeDays);
    const cutStr = cutDate.toISOString().slice(0,10).replace(/-/g,"");
    return sortedAll.filter(d => d.date_str >= cutStr);
  }, [sortedAll, rangeDays]);

  // ── Periodo anterior (misma duración, justo antes) para comparativa ──
  const previousPeriodDaily = useMemo(() => {
    if (rangeDays >= 9999 || filteredDaily.length === 0) return [];
    const idx = sortedAll.findIndex(d => d.date_str === filteredDaily[0].date_str);
    if (idx <= 0) return [];
    const start = Math.max(0, idx - filteredDaily.length);
    return sortedAll.slice(start, idx);
  }, [sortedAll, filteredDaily, rangeDays]);

  const hasPrevPeriod = previousPeriodDaily.length > 0;

  // ── KPIs ──────────────────────────────────────────────────
  const totalSessions = filteredDaily.reduce((s, d) => s + (d.sessions || 0), 0);
  const totalUsers = filteredDaily.reduce((s, d) => s + (d.users || 0), 0);
  const totalPageviews = filteredDaily.reduce((s, d) => s + (d.pageviews || 0), 0);
  const avgBounceRate = filteredDaily.length
    ? filteredDaily.reduce((s, d) => s + (d.bounce_rate || 0), 0) / filteredDaily.length
    : 0;

  const prevSessions = previousPeriodDaily.reduce((s, d) => s + (d.sessions || 0), 0);
  const prevUsers = previousPeriodDaily.reduce((s, d) => s + (d.users || 0), 0);
  const prevPageviews = previousPeriodDaily.reduce((s, d) => s + (d.pageviews || 0), 0);
  const prevAvgBounceRate = previousPeriodDaily.length
    ? previousPeriodDaily.reduce((s, d) => s + (d.bounce_rate || 0), 0) / previousPeriodDaily.length
    : 0;

  const sessionsDelta = hasPrevPeriod ? pctDelta(totalSessions, prevSessions) : null;
  const usersDelta = hasPrevPeriod ? pctDelta(totalUsers, prevUsers) : null;
  const pageviewsDelta = hasPrevPeriod ? pctDelta(totalPageviews, prevPageviews) : null;
  const bounceDelta = hasPrevPeriod ? pctDelta(avgBounceRate, prevAvgBounceRate) : null;

  // Comparativa primera mitad vs segunda mitad del período, para saber si sube o baja
  const half = Math.floor(filteredDaily.length / 2);
  const firstHalfSessions = filteredDaily.slice(0, half).reduce((s, d) => s + (d.sessions || 0), 0);
  const secondHalfSessions = filteredDaily.slice(half).reduce((s, d) => s + (d.sessions || 0), 0);
  const sessionsTrendUp = secondHalfSessions >= firstHalfSessions;

  // ── Gráfica diaria: sesiones y usuarios ──────────────────────
  const evoData = useMemo(() => {
    const step = filteredDaily.length > 120 ? Math.ceil(filteredDaily.length / 90) : 1;
    return filteredDaily
      .filter((_, i) => i % step === 0 || i === filteredDaily.length - 1)
      .map(d => ({
        name: dateStrToLabel(d.date_str),
        Sesiones: Math.round(d.sessions || 0),
        Usuarios: Math.round(d.users || 0),
      }));
  }, [filteredDaily]);

  // ── Gráfica mensual: páginas vistas ─────────────────────────
  const pageviewsByMonth = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => {
      const key = `${d.year}-${String(d.month).padStart(2,"0")}`;
      if (!map[key]) map[key] = { pageviews: 0, month: d.month, year: d.year };
      map[key].pageviews += d.pageviews || 0;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => ({
        name: `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
        "Páginas vistas": Math.round(d.pageviews),
      }));
  }, [filteredDaily]);

  const hasData = ga4Daily.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Tráfico web (GA4)"
        subtitle="Google Analytics 4 · sesiones, usuarios y páginas vistas"
        icon={LineChartIcon}
        badge="Web"
      />

      {!hasData && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          <LineChartIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin datos de GA4 todavía</p>
        </div>
      )}

      {hasData && (
        <>
          {/* Selector de rango */}
          <div className="flex gap-1.5 mb-5 flex-wrap">
            {RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setRangeDays(r.days)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  rangeDays === r.days
                    ? "text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                style={rangeDays === r.days ? { background: GA_ORANGE } : {}}
              >
                {r.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground self-center">
              {filteredDaily.length} días · {ga4Daily.length} en total
              {hasPrevPeriod && " · vs. periodo anterior"}
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                icon: MousePointerClick,
                label: "Sesiones",
                value: fmtN(totalSessions),
                sub: `en ${filteredDaily.length} días`,
                color: GA_ORANGE,
                delta: sessionsDelta,
              },
              {
                icon: Users,
                label: "Usuarios",
                value: fmtN(totalUsers),
                sub: "usuarios activos",
                color: GA_BLUE,
                delta: usersDelta,
              },
              {
                icon: Eye,
                label: "Páginas vistas",
                value: fmtN(totalPageviews),
                sub: "en el período",
                color: GA_ORANGE,
                delta: pageviewsDelta,
              },
              {
                icon: LineChartIcon,
                label: "Tasa de rebote",
                value: fmtPct(avgBounceRate),
                sub: "promedio del período",
                color: GA_BLUE,
                delta: bounceDelta,
                invert: true, // menos rebote es mejor
              },
            ].map(({ icon: Icon, label, value, sub, color, delta, invert }) => (
              <div key={label} className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="w-3.5 h-3.5" style={{ color }} />
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {label}
                    </span>
                  </div>
                  <DeltaBadge delta={delta} invert={invert} />
                </div>
                <p className="text-2xl font-light" style={{ color }}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* Sesiones y usuarios diarios */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Sesiones y usuarios diarios
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evoData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="ga4SessionsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GA_ORANGE} stopOpacity={0.35} />
                        <stop offset="95%" stopColor={GA_ORANGE} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="ga4UsersGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={GA_BLUE} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={GA_BLUE} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                      axisLine={false} tickLine={false}
                      interval={Math.max(0, Math.floor(evoData.length / 7))} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                      axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="Sesiones" stroke={GA_ORANGE}
                      fill="url(#ga4SessionsGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Usuarios" stroke={GA_BLUE}
                      fill="url(#ga4UsersGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Páginas vistas mensual */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Páginas vistas — evolución mensual
              </p>
              {pageviewsByMonth.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pageviewsByMonth} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                        axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                        axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="Páginas vistas" fill={GA_ORANGE} radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-6 text-center">Sin datos</p>
              )}
            </div>
          </div>

          {/* Insights */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightCard
              type={sessionsTrendUp ? "success" : "warning"}
              title="Tendencia de tráfico"
              description={
                sessionsTrendUp
                  ? `El tráfico se mantiene o crece: ${fmtN(totalSessions)} sesiones en ${filteredDaily.length} días, con ${fmtN(totalUsers)} usuarios activos.`
                  : `El tráfico bajó en la segunda mitad del período. ${fmtN(totalSessions)} sesiones totales — revisa campañas o cambios en el sitio.`
              }
            />
            <InsightCard
              type={avgBounceRate > 0.6 ? "warning" : "info"}
              title="Tasa de rebote"
              description={
                avgBounceRate > 0.6
                  ? `Tasa de rebote promedio de ${fmtPct(avgBounceRate)}, algo elevada. Revisa la relevancia de las páginas de entrada.`
                  : `Tasa de rebote promedio de ${fmtPct(avgBounceRate)} sobre ${fmtN(totalPageviews)} páginas vistas en el período.`
              }
            />
          </div>
        </>
      )}
    </motion.div>
  );
}
