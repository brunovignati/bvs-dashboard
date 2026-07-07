import { useSubscribers, usePushSubscribers } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { UserCheck, Mail, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
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
    </div>
  );
};

export default function SubscriberHealth() {
  const { data: subsData     = [] } = useSubscribers();
  const { data: pushSubsData = [] } = usePushSubscribers();
  const { filterByPeriod } = useComparison();

  const periodSubs     = filterByPeriod(subsData);
  const periodPushSubs = filterByPeriod(pushSubsData);

  // ── Email subscribers ──────────────────────────────────────
  const months = [...new Set((periodSubs.length > 0 ? periodSubs : subsData).map(s => `${s.year}-${String(s.month).padStart(2,'0')}`))]
    .sort();

  const activeSubs = periodSubs.length > 0 ? periodSubs : subsData;
  const emailChartData = months.map(ym => {
    const [year, month] = ym.split('-').map(Number);
    const sub   = activeSubs.find(s => s.year === year && s.month === month && s.status === 'subscribed');
    const unsub = activeSubs.find(s => s.year === year && s.month === month && (s.status === 'unsubscribed' || s.status === 'none'));
    return {
      name:        `${monthLabel(month)} ${String(year).slice(2)}`,
      Suscritos:   sub?.contacts   || 0,
      Desuscritos: unsub?.contacts || 0,
    };
  });

  const lastSub   = activeSubs.filter(s => s.status === 'subscribed').slice(-1)[0];
  const lastUnsub = activeSubs.filter(s => s.status === 'unsubscribed').slice(-1)[0];

  // ── Push subscribers como AreaChart ────────────────────────
  const activePushSubs = periodPushSubs.length > 0 ? periodPushSubs : pushSubsData;
  const pushSorted = [...activePushSubs].sort((a, b) =>
    a.year !== b.year ? a.year - b.year : a.month - b.month
  );
  const pushChartData = pushSorted.map(d => ({
    name:         `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
    Suscriptores: d.contacts  || 0,
    Cambio:       d.increment || 0,
  }));
  const latestPush   = pushChartData[pushChartData.length - 1];
  const totalPushLoss = activePushSubs.reduce((s, d) => s + (d.increment || 0), 0);
  const pushMin = Math.min(...pushChartData.map(d => d.Suscriptores));
  const pushMax = Math.max(...pushChartData.map(d => d.Suscriptores));

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.45 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Salud de Base de Suscriptores"
        subtitle="Evolución de email y push suscripciones"
        icon={UserCheck}
        badge="Salud"
      />

      {/* ── Suscripción Email ── */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" /> Suscripción Email — últimos 12 meses
        </p>
        {emailChartData.length > 0 ? (
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={emailChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="subGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(160,84%,39%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(160,84%,39%)" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="unsubGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="hsl(0,84%,60%)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(0,84%,60%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(emailChartData.length / 8))} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                <Area type="monotone" dataKey="Suscritos"   stroke="hsl(160,84%,39%)" fill="url(#subGrad)"   strokeWidth={2} />
                <Area type="monotone" dataKey="Desuscritos" stroke="hsl(0,84%,60%)"   fill="url(#unsubGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-muted-foreground text-sm">Cargando datos...</div>
        )}
      </div>

      {/* ── Suscriptores Push como AreaChart ── */}
      <div className="pt-5 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Bell className="w-3.5 h-3.5" /> Suscriptores Push — evolución mensual
          </p>
          {latestPush && (
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Último mes: <span className="font-semibold text-foreground">{fmtNumber(latestPush.Suscriptores)}</span></span>
              <span>Min: <span className="font-mono">{fmtNumber(pushMin)}</span></span>
              <span>Max: <span className="font-mono">{fmtNumber(pushMax)}</span></span>
            </div>
          )}
        </div>

        {pushChartData.length > 0 ? (
          <>
            <div className="h-52 mb-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={pushChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pushSubGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="hsl(280,65%,60%)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="hsl(280,65%,60%)" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(pushChartData.length / 8))} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmtNumber(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
  3               <Area type="monotone" dataKey="Suscriptores" stroke="hsl(280,65%,60%)" fill="url(#pushSubGrad)" strokeWidth={2} dot={{ r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Cambio mensual como barras */}
            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Variación neta mensual</p>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pushChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    interval={Math.max(0, Math.floor(pushChartData.length / 8))} />
                  <YAxis tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v, n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Cambio" name="Variación" radius={[2, 2, 0, 0]} maxBarSize={24}>
                    {pushChartData.map((d, i) => (
                      <Cell key={i} fill={d.Cambio >= 0 ? 'hsl(160,84%,39%)' : 'hsl(0,84%,60%)'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <p className="text-muted-foreground text-sm py-4">Cargando datos...</p>
        )}
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type="warning"
          title="Ratio Suscritos/Desuscritos"
          description={lastSub && lastUnsub
            ? `Los desuscritos (${fmtNumber(lastUnsub.contacts)}) superan a los suscritos (${fmtNumber(lastSub.contacts)}). Tendencia negativa — revisar frecuencia de envío y segmentación.`
            : 'Analiza la evolución de suscripciones para detectar tendencias negativas.'}
        />
        <InsightCard
          type={totalPushLoss < 0 ? "danger" : "info"}
          title="Evolución Suscriptores Push"
          description={totalPushLoss < 0
            ? `Caída neta de ${fmtNumber(Math.abs(totalPushLoss))} suscriptores push en el período. Implementar estrategias de re-opt-in y mejorar la propuesta de valor de las notificaciones.`
            : `Evolución neta de ${fmtNumber(totalPushLoss)} suscriptores push en el período.`}
        />
      </div>
    </motion.div>
  );
}
