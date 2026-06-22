import { useSubscribers, usePushSubscribers } from "@/lib/useEntities";
import { fmtNumber, monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { UserCheck } from "lucide-react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
  // ✅ MIGRADO: datos reales de Supabase
  const { data: subsData     = [] } = useSubscribers();
  const { data: pushSubsData = [] } = usePushSubscribers();

  // Agrupar suscriptores email por mes
  const months = [...new Set(subsData.map(s => `${s.year}-${String(s.month).padStart(2,'0')}`))]
    .sort()
    .slice(-6); // últimos 6 meses

  const chartData = months.map(ym => {
    const [year, month] = ym.split('-').map(Number);
    const sub   = subsData.find(s => s.year === year && s.month === month && s.status === 'subscribed');
    const unsub = subsData.find(s => s.year === year && s.month === month && (s.status === 'unsubscribed' || s.status === 'none'));
    return {
      name:        `${monthLabel(month)} ${year}`,
      Suscritos:   sub?.contacts   || 0,
      Desuscritos: unsub?.contacts || 0,
    };
  });

  // Push subscribers ordenados
  const pushData = [...pushSubsData]
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map(d => ({
      name:         `${monthLabel(d.month)} ${d.year}`,
      Suscriptores: d.contacts  || 0,
      Cambio:       d.increment || 0,
    }));

  const totalPushLoss = pushSubsData.reduce((s, d) => s + (d.increment || 0), 0);

  // Calcular ratio suscripción
  const lastSub   = subsData.filter(s => s.status === 'subscribed').slice(-1)[0];
  const lastUnsub = subsData.filter(s => s.status === 'unsubscribed').slice(-1)[0];

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Suscripción Email</p>
          <div className="h-48">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 0 }}>
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
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v/1000).toFixed(0)}K`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={6} wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="Suscritos"   stroke="hsl(160,84%,39%)" fill="url(#subGrad)"   strokeWidth={2} />
                  <Area type="monotone" dataKey="Desuscritos" stroke="hsl(0,84%,60%)"   fill="url(#unsubGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground text-sm">Cargando datos...</div>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Suscriptores Push</p>
          <div className="space-y-2">
            {pushData.length > 0 ? pushData.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-muted/50 rounded-xl">
                <div className="flex-1">
                  <p className="text-xs font-medium">{d.name}</p>
                  <p className="text-lg font-bold font-heading">{fmtNumber(d.Suscriptores)}</p>
                </div>
                <div className={`text-xs font-mono font-medium px-2 py-1 rounded-lg ${d.Cambio < 0 ? 'bg-red-500/10 text-red-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                  {d.Cambio > 0 ? '+' : ''}{fmtNumber(d.Cambio)}
                </div>
              </div>
            )) : (
              <p className="text-muted-foreground text-sm p-3">Cargando datos...</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type="warning"
          title="Ratio Suscritos/Desuscritos"
          description={lastSub && lastUnsub
            ? `Los desuscritos (${fmtNumber(lastUnsub.contacts)}) superan a los suscritos (${fmtNumber(lastSub.contacts)}). La tasa de desuscripción neta indica que se pierden más suscriptores de los que se ganan. Se recomienda revisar la frecuencia de envío.`
            : 'Analiza la evolución de suscripciones para detectar tendencias negativas.'}
        />
        <InsightCard
          type={totalPushLoss < 0 ? "danger" : "info"}
          title="Evolución Suscriptores Push"
          description={totalPushLoss < 0
            ? `Los suscriptores push han caído ${fmtNumber(Math.abs(totalPushLoss))} en el período analizado. La tendencia es negativa. Es necesario implementar estrategias de re-opt-in y mejorar la propuesta de valor push.`
            : `Los suscriptores push muestran una evolución de ${fmtNumber(totalPushLoss)} en el período. Monitoriza la tendencia para detectar cambios.`}
        />
      </div>
    </motion.div>
  );
}
