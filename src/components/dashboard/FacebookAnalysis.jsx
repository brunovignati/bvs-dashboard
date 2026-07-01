import { useMemo, useState } from "react";
import { useFbDaily } from "@/lib/useEntities";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Facebook, TrendingUp, Eye, Users, MousePointer } from "lucide-react";
import { motion } from "framer-motion";
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from "recharts";

// ─── Helpers ─────────────────────────────────────────────────
const FB_BLUE  = "#1877F2";
const FB_GREEN = "#42B72A";

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

const RANGES = [
  { label: "30 días",  days: 30   },
  { label: "3 meses",  days: 90   },
  { label: "6 meses",  days: 180  },
  { label: "Todo",     days: 9999 },
];

export default function FacebookAnalysis() {
  const { data: fbDaily = [] } = useFbDaily();
  const [rangeDays, setRangeDays] = useState(90);

  const filteredDaily = useMemo(() => {
    const sorted = [...fbDaily].sort((a, b) => a.date_str.localeCompare(b.date_str));
    if (rangeDays >= 9999) return sorted;
    const last = sorted[sorted.length - 1];
    if (!last) return sorted;
    const cutDate = new Date(`${last.date_str.slice(0,4)}-${last.date_str.slice(4,6)}-${last.date_str.slice(6,8)}`);
    cutDate.setDate(cutDate.getDate() - rangeDays);
    const cutStr = cutDate.toISOString().slice(0,10).replace(/-/g,"");
    return sorted.filter(d => d.date_str >= cutStr);
  }, [fbDaily, rangeDays]);

  const latestDay = filteredDaily.filter(d => d.followers != null).slice(-1)[0] || {};
  const firstDay  = filteredDaily.filter(d => d.followers != null)[0] || {};
  const followerDelta = (latestDay.followers || 0) - (firstDay.followers || 0);
  const totalViews    = filteredDaily.reduce((s, d) => s + (d.page_media_view || 0), 0);
  const totalPageViews = filteredDaily.reduce((s, d) => s + (d.page_views || 0), 0);
  const netFollowers  = filteredDaily.reduce((s, d) => s + (d.followers_acquired || 0) - (d.followers_lost || 0), 0);

  const evoData = useMemo(() => {
    const step = filteredDaily.length > 120 ? Math.ceil(filteredDaily.length / 90) : 1;
    return filteredDaily
      .filter((_, i) => i % step === 0 || i === filteredDaily.length - 1)
      .map(d => ({
        name:    dateStrToLabel(d.date_str),
        Vistas:  Math.round(d.page_media_view || 0),
        PagVistas: Math.round(d.page_views || 0),
      }));
  }, [filteredDaily]);

  const followersByMonth = useMemo(() => {
    const map = {};
    filteredDaily.filter(d => d.followers != null).forEach(d => {
      const key = `${d.year}-${String(d.month).padStart(2,"0")}`;
      if (!map[key] || d.date_str > map[key].date_str) map[key] = d;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, d]) => ({
        name: `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
        Seguidores: Math.round(d.followers || 0),
      }));
  }, [filteredDaily]);

  const hasData = fbDaily.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Facebook"
        subtitle="Pagina barakaldovetshop · datos diarios desde Metricool"
        icon={Facebook}
        badge="Social"
      />

      {!hasData && (
        <div className="py-12 text-center text-muted-foreground text-sm">
          <Facebook className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Sin datos de Facebook todavia</p>
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
                  rangeDays === r.days ? "text-white" : "bg-muted text-muted-foreground hover:bg-muted/70"
                }`}
                style={rangeDays === r.days ? { background: FB_BLUE } : {}}
              >
                {r.label}
              </button>
            ))}
            <span className="ml-auto text-[10px] text-muted-foreground self-center">
              {filteredDaily.length} dias · {fbDaily.length} en total
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Users, label: "Seguidores", value: fmtN(latestDay.followers),
                sub: followerDelta !== 0 ? `${followerDelta > 0 ? "+" : ""}${fmtN(followerDelta)} en el periodo` : "actuales", color: FB_BLUE },
              { icon: Eye, label: "Vistas de contenido", value: fmtN(totalViews),
                sub: `en ${filteredDaily.length} dias`, color: FB_BLUE },
              { icon: MousePointer, label: "Vistas de pagina", value: fmtN(totalPageViews),
                sub: "visitas al perfil", color: FB_GREEN },
              { icon: TrendingUp, label: "Seguidores netos", value: `${netFollowers >= 0 ? "+" : ""}${fmtN(netFollowers)}`,
                sub: "ganados menos perdidos", color: netFollowers >= 0 ? FB_GREEN : "#E34234" },
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Vistas diarias</p>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={evoData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fbVistasGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FB_BLUE} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={FB_BLUE} stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="fbPagGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={FB_GREEN} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={FB_GREEN} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                      interval={Math.max(0, Math.floor(evoData.length / 7))} />
                    <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                      tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                    <Area type="monotone" dataKey="Vistas" stroke={FB_BLUE} fill="url(#fbVistasGrad)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="PagVistas" stroke={FB_GREEN} fill="url(#fbPagGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Seguidores mensuales</p>
              {followersByMonth.length > 0 ? (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={followersByMonth} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fbFolGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={FB_BLUE} stopOpacity={0.35} />
                          <stop offset="95%" stopColor={FB_BLUE} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                        interval={Math.max(0, Math.floor(followersByMonth.length / 8))} />
                      <YAxis tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                        tickFormatter={v => `${(v/1000).toFixed(1)}K`} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Seguidores" stroke={FB_BLUE} fill="url(#fbFolGrad)" strokeWidth={2} dot={{ r: 3, fill: FB_BLUE }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-muted-foreground text-sm py-6 text-center">Sin datos</p>}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
            <InsightCard
              type={followerDelta >= 0 ? "success" : "warning"}
              title="Evolucion de seguidores"
              description={followerDelta > 0
                ? `+${fmtN(followerDelta)} seguidores en el periodo. Facebook mantiene base activa de ${fmtN(latestDay.followers)} seguidores.`
                : followerDelta < 0
                ? `${fmtN(Math.abs(followerDelta))} seguidores perdidos. Considera aumentar la frecuencia de publicacion.`
                : `Seguidores estables en ${fmtN(latestDay.followers)}. Analiza el contenido con mas alcance organico.`}
            />
            <InsightCard
              type="info"
              title="Vistas de contenido"
              description={`${fmtN(totalViews)} vistas de contenido en ${filteredDaily.length} dias. Las vistas de pagina (${fmtN(totalPageViews)}) reflejan visitas directas al perfil.`}
            />
          </div>
        </>
      )}
    </motion.div>
  );
}
