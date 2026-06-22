import { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { usePushCampaigns, useDailyPush } from "@/lib/useEntities";
import SectionHeader from "./SectionHeader";
import MiniTable from "./MiniTable";
import InsightCard from "./InsightCard";
import KPICard from "./KPICard";
import { Bell, Send, Target, CalendarDays } from "lucide-react";
import { motion } from "framer-motion";

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PUSH_COLOR = "hsl(280,65%,60%)";

export default function PushAnalysis() {
  const [granularity, setGranularity] = useState('monthly');
  const { data: pushCampaigns = [] } = usePushCampaigns();
  const { data: dailyPush = [] }     = useDailyPush();

  const columns = [
    {
      key: "workflow",
      label: "Campaña",
      bold: true,
      render: (v) => <div className="max-w-[180px] truncate text-xs" title={v}>{v}</div>,
    },
    { key: "sent", label: "Enviados", align: "right", render: (v) => fmtNumber(v) },
    { key: "opens", label: "Aperturas", align: "right", render: (v) => fmtNumber(v) },
    {
      key: "openRate",
      label: "Open Rate",
      align: "right",
      render: (_, row) => {
        const rate = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
        return <span className={rate > 50 ? "text-emerald-500 font-semibold" : ""}>{rate.toFixed(1)}%</span>;
      },
    },
    { key: "clicks", label: "Clics", align: "right", render: (v) => fmtNumber(v) },
    { key: "purchases", label: "Compras", align: "right", render: (v) => fmtNumber(v) },
    { key: "revenue", label: "Revenue", align: "right", render: (v) => fmtCurrency(v) },
  ];

  const totalPushRevenue   = pushCampaigns.reduce((s, d) => s + d.revenue, 0);
  const totalPushPurchases = pushCampaigns.reduce((s, d) => s + d.purchases, 0);
  const totalPushSent      = pushCampaigns.reduce((s, d) => s + d.sent, 0);
  const convRate = totalPushSent > 0 ? (totalPushPurchases / totalPushSent * 100) : 0;

  // Daily view: aggregate by day across all workflows
  const [dailyRange, setDailyRange] = useState(90);
  const sortedDaily = [...dailyPush].sort((a,b) =>
    a.year!==b.year ? a.year-b.year : a.month!==b.month ? a.month-b.month : a.day-b.day
  );
  // Aggregate per day
  const dayMap = {};
  for (const d of sortedDaily) {
    const key = `${d.year}-${String(d.month).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
    if (!dayMap[key]) dayMap[key] = { year: d.year, month: d.month, day: d.day, sent: 0, opens: 0, clicks: 0 };
    dayMap[key].sent   += d.sent   || 0;
    dayMap[key].opens  += d.opens  || 0;
    dayMap[key].clicks += d.clicks || 0;
  }
  const aggDays = Object.values(dayMap).sort((a,b) =>
    a.year!==b.year ? a.year-b.year : a.month!==b.month ? a.month-b.month : a.day-b.day
  );
  const slicedDays = dailyRange === 0 ? aggDays : aggDays.slice(-dailyRange);
  const dailyChartData = slicedDays.map(d => ({
    name:    `${d.day} ${MONTHS_ES[(d.month||1)-1]}`,
    Enviados: d.sent || 0,
    Aperturas: d.opens || 0,
    Clics:    d.clicks || 0,
  }));
  const totalDailySent  = slicedDays.reduce((s,d) => s+(d.sent||0), 0);
  const totalDailyOpens = slicedDays.reduce((s,d) => s+(d.opens||0), 0);
  const avgOpenRate = totalDailySent > 0 ? (totalDailyOpens/totalDailySent*100).toFixed(1) : '0.0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
    >
      <SectionHeader
        title="Rendimiento Push Notifications"
        subtitle="Análisis de campañas push · granularidad mensual y diaria"
        icon={Bell}
        badge="Push"
      />

      {/* Granularity toggle */}
      <div className="flex gap-1 mb-4 p-1 bg-muted/40 rounded-lg w-fit">
        <button onClick={() => setGranularity('monthly')}
          className={`text-xs px-3 py-1.5 rounded-md transition-colors ${granularity==='monthly' ? 'bg-card shadow text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
          Mensual
        </button>
        <button onClick={() => setGranularity('daily')}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${granularity==='daily' ? 'bg-card shadow text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
          <CalendarDays className="w-3 h-3"/> Diario
        </button>
      </div>

      {/* Monthly view */}
      {granularity === 'monthly' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <KPICard title="Push Enviados" value={fmtNumber(totalPushSent)} subtitle="Total campañas" icon={Send} />
            <KPICard title="Compras Atribuidas" value={fmtNumber(totalPushPurchases)} subtitle="Histórico" icon={Target} accentClass="text-emerald-500" />
            <KPICard title="Revenue Push" value={fmtCurrency(totalPushRevenue)} subtitle="Histórico" icon={Bell} accentClass="text-amber-500" />
            <KPICard title="Conv. Rate" value={`${convRate.toFixed(3)}%`} subtitle="envío → compra" icon={Target} accentClass="text-violet-500" />
          </div>
          <MiniTable columns={columns} data={pushCampaigns} maxRows={10} />
        </>
      )}

      {/* Daily view */}
      {granularity === 'daily' && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>Total enviados: <span className="font-semibold text-foreground">{fmtNumber(totalDailySent)}</span></span>
              <span>Open rate medio: <span className="font-semibold text-foreground">{avgOpenRate}%</span></span>
            </div>
            <div className="flex gap-1">
              {[30,90,0].map(r => (
                <button key={r} onClick={() => setDailyRange(r)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors ${dailyRange===r ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50'}`}>
                  {r===0 ? 'Todo' : `${r}d`}
                </button>
              ))}
            </div>
          </div>
          {dailyPush.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos diarios aún — sync pendiente</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pushSentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PUSH_COLOR} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={PUSH_COLOR} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    interval={Math.max(1, Math.floor(dailyChartData.length/10))}/>
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmtNumber(v)}/>
                  <Tooltip formatter={(v,n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 11 }}/>
                  <Area type="monotone" dataKey="Enviados" stroke={PUSH_COLOR} fill="url(#pushSentGrad)"
                    strokeWidth={1.5} dot={false}/>
                  <Area type="monotone" dataKey="Aperturas" stroke="hsl(160,84%,39%)" fill="none"
                    strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      <div className="mt-4">
        <InsightCard
          type="warning"
          title="Push: Alto Alcance, Baja Conversión"
          description={`Con ~${fmtNumber(totalPushSent)} envíos y solo ${fmtNumber(totalPushPurchases)} compras atribuidas (${convRate.toFixed(3)}%), las push notifications tienen un ROI bajo comparado con email. El open rate es alto pero el CTR es mínimo. Se recomienda: 1) Mensajes más personalizados, 2) Deep links a producto específico, 3) Reducir frecuencia para evitar fatiga.`}
        />
      </div>
    </motion.div>
  );
}
