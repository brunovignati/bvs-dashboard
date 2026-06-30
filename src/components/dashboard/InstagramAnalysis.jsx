import { useMemo, useState } from "react";
import { useIgDaily, useIgReels } from "@/lib/useEntities";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Instagram, TrendingUp, Eye, Users, Film, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, Cell
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────
const IG_PINK   = "#e1306c";
const IG_PURPLE = "#833ab4";
const IG_BLUE   = "#1a73e8";

const fmtN = v => Number(v || 0).toLocaleString("es-ES");

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

// ─── Selector de rango ────────────────────────────────────────
const RANGES = [
  { label: "30 días",   days: 30  },
  { label: "3 meses",   days: 90  },
  { label: "6 meses",   days: 180 },
  { label: "Todo",      days: 9999 },
];

// ─── Component ───────────────────────────────────────────────
export default function InstagramAnalysis() {
  const { data: igDaily = [] } = useIgDaily();
  const { data: igReels = [] } = useIgReels();
  const [rangeDays, setRangeDays] = useState(90);

  // ── Filtrar por rango ──────────────────────────────────────
  const filteredDaily = useMemo(() => {
    const sorted = [...igDaily].sort((a, b) => a.date_str.localeCompare(b.date_str));
    if (rangeDays >= 9999) return sorted;
    const cutoff = sorted.length > 0
      ? sorted[sorted.length - 1].date_str
      : "";
    if (!cutoff) return sorted;
    const cutDate = new Date(
      `${cutoff.slice(0,4)}-${cutoff.slice(4,6)}-${cutoff.slice(6,8)}`
    );
    cutDate.setDate(cutDate.getDate() - rangeDays);
    const cutStr = cutDate.toISOString().slice(0,10).replace(/-/g,"");
    return sorted.filter(d => d.date_str >= cutStr);
  }, [igDaily, rangeDays]);

  // ── KPIs ──────────────────────────────────────────────────
  const latestDay  = filteredDaily[filteredDaily.length - 1] || {};
  const firstDay   = filteredDaily[0] || {};
  const totalViews = filteredDaily.reduce((s, d) => s + (d.views || 0), 0);
  const avgReach   = filteredDaily.length
    ? Math.round(filteredDaily.reduce((s, d) => s + (d.reach || 0), 0) / filteredDaily.length)
    : 0;
  const reelsPub   = filteredDaily.reduce((s, d) => s + (d.reels_count || 0), 0);
  const followerDelta = (latestDay.followers || 0) - (firstDay.followers || 0);

  // ── Gráfica diaria ─────────────────────────────────────────
  const evoData = useMemo(() => {
    const step = filteredDaily.length > 120 ? Math.ceil(filteredDaily.length / 90) : 1;
    return filteredDaily
      .filter((_, i) => i % step === 0 || i === filteredDaily.length - 1)
      .map(d => ({
        name:    dateStrToLabel(d.date_str),
        Alcance: Math.round(d.reach    || 0),
        Views:   Math.round(d.views    || 0),
      }));
  }, [filteredDaily]);

  // ── Gráfica mensual de seguidores ─────────────────────────
  const followersByMonth = useMemo(() => {
    const map = {};
    filteredDaily.forEach(d => {
      const key = `${d.year}-${String(d.month).padStart(2,"0")}`;
      if (!map[key] || d.date_str > map[key].date_str) map[key] = d;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, d]) => ({
        name:       `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
        Seguidores: Math.round(d.followers || 0),
      }));
  }, [filteredDaily]);

  // ── Top reels ─────────────────────────────────────────────
  const filteredReels = useMemo(() => {
    if (!igReels.length) return [];
    const firstDateStr = filteredDaily[0]?.date_str || "";
    return [...igReels]
      .filter(r => !firstDateStr || r.date_str >= firstDateStr)
      .sort((a, b) => (b.views || 0) - (a.views || 0));
  }, [igReels, filteredDaily]);

  const hasData = igDaily.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Instagram"
        subtitle="@barakaldotiendaveterinaria · datos acumulados desde Metricool"
        icon={Instagram}
        badge="Social"
      />

      {!hasData && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          <Instagram className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Pendiente primer sync de Metricool</p>
          <p className="text-xs mt-1">
            Configura <code className="bg-muted px-1 rounded">METRICOOL_TOKEN</code> en GitHub Secrets
            y ejecuta el workflow a mano para cargar el historial inicial.
          </p>
        </div>
      )}

      {hasData && (
        <>
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
                style={rangeDays === r.days ? { background: IG_PINK } : {}}
              >
                {r.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground self-center">
              {filteredDaily.length} días · {igDaily.length} días en total
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Users,     label: "Seguidores",      value: fmtN(latestDay.followers), sub: followerDelta !== 0 ? `${followerDelta > 0 ? "+" : ""}${fmtN(followerDelta)} en el período` : "actuales",            color: IG_PINK   },
              { icon: Eye,       label: "Alcance medio/día", value: fmtN(avgReach),           sub: "orgánico",                                                                                                       color: IG_PURPLE },
              { icon: TrendingUp,label: "Views totales",    value: fmtN(totalViews),          sub: `en ${filteredDaily.length} días`,                                                                               color: IG_BLUE   },
              { icon: Film,      label: "Reels publicados", value: fmtN(reelsPub),            sub: "en el período",                                                                                                  color: IG_PINK   },
            ].map(({ icon: Icon, label, value, sub, color }) => (
              <div key={label} className="bg-muted/30 rounded-xl p-4 border border-border">
                <div className="flex items-center gap-1.5 mb-2">
                  <Icon className="w-3.5 h-3.5" style={{ color }} />
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
                </div>
                <p className="text-2xl font-light" style={{ color }}>{value}</p>
                <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Alcance & Views diarios</p>
              {evoData.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={evoData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="alcGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={IG_BLUE}   stopOpacity={0.3} />
                          <stop offset="95%" stopColor={IG_BLUE}   stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="vwGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={IG_PINK}   stopOpacity={0.3} />
                          <stop offset="95%" stopColor={IG_PINK}   stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(evoData.length / 7))} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                      <Area type="monotone" dataKey="Alcance" stroke={IG_BLUE}   fill="url(#alcGrad)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="Views"   stroke={IG_PINK}   fill="url(#vwGrad)"  strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-sm py-6 text-center">Sin datos</p>}
            </div>

            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Seguidores — evolución mensual</p>
              {followersByMonth.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={followersByMonth} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="folGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={IG_PURPLE} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={IG_PURPLE} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(followersByMonth.length / 8))} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(1)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Seguidores" stroke={IG_PURPLE} fill="url(#folGrad)" strokeWidth={2} dot={{ r: 3, fill: IG_PURPLE }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-sm py-6 text-center">Sin datos</p>}
            </div>
          </div>

          {filteredReels.length > 0 && (
            <div className="pt-5 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Top Reels del período — ordenados por views</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      {["Fecha","Contenido","Views","Alcance","Likes","Eng. %","Ver"].map(h => (
                        <th key={h} className="text-left py-2 px-2 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReels.slice(0, 15).map((reel, i) => {
                      const ds = reel.date_str || "";
                      const dateLabel = ds.length === 8 ? `${ds.slice(6)}/${ds.slice(4,6)}/${ds.slice(0,4)}` : ds;
                      const maxEng = Math.max(...filteredReels.map(r => r.engagement || 0), 1);
                      return (
                        <tr key={reel.url || i} className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                          <td className="py-2 px-2 text-muted-foreground whitespace-nowrap">{dateLabel}</td>
                          <td className="py-2 px-2 max-w-[220px]"><span className="line-clamp-2 leading-snug" title={reel.content}>{reel.content?.slice(0, 80) || "—"}</span></td>
                          <td className="py-2 px-2 font-mono font-medium tabular-nums" style={{ color: IG_PINK }}>{fmtN(reel.views)}</td>
                          <td className="py-2 px-2 font-mono tabular-nums">{fmtN(reel.reach)}</td>
                          <td className="py-2 px-2 font-mono tabular-nums">{fmtN(reel.likes)}</td>
                          <td className="py-2 px-2">
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 rounded-full" style={{ width: `${Math.round(((reel.engagement||0)/maxEng)*48)}px`, background: IG_PURPLE, minWidth: "2px" }} />
                              <span className="font-mono">{(reel.engagement||0).toFixed(1)}%</span>
                            </div>
                          </td>
                          <td className="py-2 px-2">{reel.url ? <a href={reel.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:underline" style={{ color: IG_PINK }}><ExternalLink className="w-3 h-3" /><span>Ver</span></a> : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightCard
              type={followerDelta >= 0 ? "success" : "warning"}
              title="Crecimiento de seguidores"
              description={
                followerDelta > 0
                  ? `+${fmtN(followerDelta)} seguidores en el período seleccionado. Tendencia positiva — mantener cadencia de reels y engagement.`
                  : followerDelta < 0
                  ? `${fmtN(followerDelta)} seguidores en el período. Revisar frecuencia de publicación y tipo de contenido.`
                  : `Seguidores estables en ${fmtN(latestDay.followers)}. Analiza el engagement para detectar oportunidades de crecimiento.`
              }
            />
            <InsightCard
              type="info"
              title="Historial acumulado"
              description={`${igDaily.length} días de datos guardados en Supabase. Cada noche el sync añade los últimos 60 días sin sobrescribir el histórico. Después de 12 meses tendrás un año completo visible aquí.`}
            />
          </div>
        </>
      )}
    </motion.div>
  );
}
