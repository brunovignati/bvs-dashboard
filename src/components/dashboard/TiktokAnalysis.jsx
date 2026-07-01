import { useMemo, useState } from "react";
import { useTkDaily } from "@/lib/useEntities";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { TrendingUp, Eye, Users, Play, Activity } from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────
const TK_RED   = "#EE1D52";
const TK_TEAL  = "#69C9D0";
const TK_DARK  = "#010101";

const fmtN = v => Number(v || 0).toLocaleString("es-ES");

// TikTok icon (SVG custom ya que lucide no lo tiene)
function TikTokIcon({ className, style }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.72a4.85 4.85 0 0 1-1.01-.03z"/>
    </svg>
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
  { label: "30 días",  days: 30   },
  { label: "3 meses",  days: 90   },
  { label: "6 meses",  days: 180  },
  { label: "Todo",     days: 9999 },
];

// ─── Component ───────────────────────────────────────────────
export default function TiktokAnalysis() {
  const { data: tkDaily = [] } = useTkDaily();
  const [rangeDays, setRangeDays] = useState(90);

  const filteredDaily = useMemo(() => {
    const sorted = [...tkDaily].sort((a, b) => a.date_str.localeCompare(b.date_str));
    if (rangeDays >= 9999) return sorted;
    const last = sorted[sorted.length - 1];
    if (!last) return sorted;
    const cutDate = new Date(`${last.date_str.slice(0,4)}-${last.date_str.slice(4,6)}-${last.date_str.slice(6,8)}`);
    cutDate.setDate(cutDate.getDate() - rangeDays);
    const cutStr = cutDate.toISOString().slice(0,10).replace(/-/g,"");
    return sorted.filter(d => d.date_str >= cutStr);
  }, [tkDaily, rangeDays]);

  // ── KPIs ──────────────────────────────────────────────────
  const latestDay     = filteredDaily.filter(d => d.followers != null).slice(-1)[0] || {};
  const firstDay      = filteredDaily.filter(d => d.followers != null)[0] || {};
  const followerDelta = (latestDay.followers || 0) - (firstDay.followers || 0);
  const totalViews    = filteredDaily.reduce((s, d) => s + (d.account_views || 0), 0);
  const totalInteractions = filteredDaily.reduce((s, d) => s + (d.interactions || 0), 0);
  const videosPublished   = filteredDaily.reduce((s, d) => s + (d.videos || 0), 0);

  // ── Gráfica diaria de vistas ────────────────────────────────
  const evoData = useMemo(() => {
    const step = filteredDaily.length > 120 ? Math.ceil(filteredDaily.length / 90) : 1;
    return filteredDaily
      .filter((_, i) => i % step === 0 || i === filteredDaily.length - 1)
      .map(d => ({
        name:   dateStrToLabel(d.date_str),
        Vistas: Math.round(d.account_views || 0),
        Alcance: Math.round(d.reach || 0),
      }));
  }, [filteredDaily]);

  // ── Gráfica seguidores mensual ─────────────────────────────
  const followersByMonth = useMemo(() => {
    const map = {};
    filteredDaily.filter(d => d.followers != null).forEach(d => {
      const key = `${d.year}-${String(d.month).padStart(2,"0")}`;
      if (!map[key] || d.date_str > map[key].date_str) map[key] = d;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => ({
        name:       `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
        Seguidores: Math.round(d.followers || 0),
      }));
  }, [filteredDaily]);

  // ── Días con videos publicados ────────────────────────────
  const videosDays = useMemo(() =>
    filteredDaily
      .filter(d => (d.videos || 0) > 0)
      .map(d => ({
        name:   dateStrToLabel(d.date_str),
        Vistas: d.account_views || 0,
        Alcance: d.reach || 0,
      }))
      .slice(-10)
  , [filteredDaily]);

  const hasData = tkDaily.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="TikTok"
        subtitle="@barakaldovetshop · datos diarios desde Metricool"
        icon={TikTokIcon}
        badge="Social"
      />

      {!hasData && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          <Play className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin datos de TikTok todavía</p>
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
                style={rangeDays === r.days ? { background: TK_RED } : {}}
              >
                {r.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground self-center">
              {filteredDaily.length} días · {tkDaily.length} en total
            </span>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                icon: Users,
                label: "Seguidores",
                value: fmtN(latestDay.followers),
                sub: followerDelta !== 0
                  ? `${followerDelta > 0 ? "+" : ""}${fmtN(followerDelta)} en el período`
                  : "actuales",
                color: TK_RED,
              },
              {
                icon: Eye,
                label: "Views de cuenta",
                value: fmtN(totalViews),
                sub: `en ${filteredDaily.length} días`,
                color: TK_RED,
              },
              {
                icon: Activity,
                label: "Interacciones",
                value: fmtN(totalInteractions),
                sub: "likes + comentarios + shares",
                color: TK_TEAL,
              },
              {
                icon: Play,
                label: "Videos publicados",
                value: fmtN(videosPublished),
                sub: "en el período",
                color: TK_RED,
              },
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {label}
                  </span>
                </div>
                <p className="text-2xl font-light" style={{ color }}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
              </div>
            ))}
          </div>

          {/* Gráficas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

            {/* Views diarios */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Views de cuenta diarios
              </p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evoData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tkViewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={TK_RED}  stopOpacity={0.35} />
                        <stop offset="95%" stopColor={TK_RED}  stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="tkReachGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={TK_TEAL} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={TK_TEAL} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                      axisLine={false} tickLine={false}
                      interval={Math.max(0, Math.floor(evoData.length / 7))} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                      axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="Vistas" stroke={TK_RED}
                      fill="url(#tkViewsGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="Alcance" stroke={TK_TEAL}
                      fill="url(#tkReachGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Evolución seguidores mensual */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Seguidores — evolución mensual
              </p>
              {followersByMonth.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={followersByMonth} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="tkFolGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={TK_RED} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={TK_RED} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                        axisLine={false} tickLine={false}
                        interval={Math.max(0, Math.floor(followersByMonth.length / 8))} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                        axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Seguidores" stroke={TK_RED}
                        fill="url(#tkFolGrad)" strokeWidth={2} dot={{ r: 3, fill: TK_RED }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-6 text-center">Sin datos</p>
              )}
            </div>
          </div>

          {/* Videos del período con mejores métricas */}
          {videosDays.length > 0 && (
            <div className="pt-5 border-t border-border mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Días con vídeo publicado — últimas {videosDays.length} publicaciones
              </p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={videosDays} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }}
                      axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                    <Bar dataKey="Vistas" fill={TK_RED} radius={[4,4,0,0]} />
                    <Bar dataKey="Alcance" fill={TK_TEAL} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Insights */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightCard
              type={followerDelta >= 0 ? "success" : "warning"}
              title="Crecimiento en TikTok"
              description={
                followerDelta > 0
                  ? `+${fmtN(followerDelta)} seguidores en el período. TikTok sigue creciendo con ${fmtN(latestDay.followers)} seguidores actuales.`
                  : followerDelta < 0
                  ? `${fmtN(Math.abs(followerDelta))} seguidores perdidos. Aumenta la frecuencia de publicación para recuperar tracción.`
                  : `Seguidores estables en ${fmtN(latestDay.followers)}. Explora tendencias y sonidos virales para acelerar el crecimiento.`
              }
            />
            <InsightCard
              type="info"
              title="Rendimiento de videos"
              description={`${fmtN(totalViews)} views de cuenta en el período, con ${videosPublished} vídeo${videosPublished !== 1 ? 's' : ''} publicado${videosPublished !== 1 ? 's' : ''}. Las interacciones totales ascienden a ${fmtN(totalInteractions)}.`}
            />
          </div>
        </>
      )}
    </motion.div>
  );
}
