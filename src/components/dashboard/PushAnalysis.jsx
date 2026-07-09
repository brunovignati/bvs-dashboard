import { useState } from "react";
import { AreaChart, Area, ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import { usePushCampaigns, useDailyPush } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import KPICard from "./KPICard";
import { Bell, Send, Target, CalendarDays, Crosshair, Table2 } from "lucide-react";
import { motion } from "framer-motion";
import MiniTable from "./MiniTable";

const MONTHS_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const PUSH_COLOR = "hsl(214,95%,68%)";

const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl max-w-52">
      <p className="text-xs font-semibold mb-2 leading-tight line-clamp-2">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Apertura</span>
          <span className="font-mono">{d.openRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-mono font-semibold text-violet-500">{fmtCurrency(d.revenue)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Enviados</span>
          <span className="font-mono">{fmtNumber(d.sent)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Compras</span>
          <span className="font-mono">{fmtNumber(d.purchases)}</span>
        </div>
      </div>
    </div>
  );
};

export default function PushAnalysis() {
  const [view, setView] = useState('scatter');
  const [dailyRange, setDailyRange] = useState(90);
  const { data: pushCampaigns = [] } = usePushCampaigns();
  const { data: dailyPush = [] }     = useDailyPush();
  const { filterByPeriod } = useComparison();

  const periodPush      = filterByPeriod(pushCampaigns);
  const periodDailyPush = filterByPeriod(dailyPush);

  const totalPushRevenue   = periodPush.reduce((s, d) => s + d.revenue, 0);
  const totalPushPurchases = periodPush.reduce((s, d) => s + d.purchases, 0);
  const totalPushSent      = periodPush.reduce((s, d) => s + d.sent, 0);
  const convRate = totalPushSent > 0 ? (totalPushPurchases / totalPushSent * 100) : 0;

  // Scatter data
  const scatterData = periodPush.filter(c => c.sent > 0).map(c => ({
    name: c.workflow || c.emailName || 'Push',
    openRate: c.sent > 0 ? (c.opens / c.sent) * 100 : 0,
    x: c.sent > 0 ? (c.opens / c.sent) * 100 : 0,
    y: c.revenue || 0,
    z: Math.max(50, Math.min(800, c.sent / 15)),
    revenue: c.revenue || 0,
    sent: c.sent,
    purchases: c.purchases || 0,
  }));
  const revs = scatterData.map(d => d.revenue).sort((a, b) => a - b);
  const q75  = revs[Math.floor(revs.length * 0.75)] || 1;
  const q50  = revs[Math.floor(revs.length * 0.5)]  || 1;
  const avgX = scatterData.length > 0 ? scatterData.reduce((s, d) => s + d.x, 0) / scatterData.length : 0;
  const avgY = scatterData.length > 0 ? scatterData.reduce((s, d) => s + d.y, 0) / scatterData.length : 0;
  const getColor = (d) =>
    d.revenue >= q75 ? 'hsl(226,71%,40%)' :
    d.revenue >= q50 ? 'hsl(213,96%,80%)' :
    'hsl(220,13%,65%)';

  // Table columns
  const columns = [
    { key: "workflow", label: "Campaña", bold: true,
      render: (v) => <div className="max-w-[180px] truncate text-xs" title={v}>{v}</div> },
    { key: "sent", label: "Enviados", align: "right", render: (v) => fmtNumber(v) },
    { key: "openRate", label: "Open Rate", align: "right",
      render: (_, row) => { const r = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
        return <span className={r > 50 ? "text-violet-500 font-semibold" : ""}>{r.toFixed(1)}%</span>; } },
    { key: "purchases", label: "Compras", align: "right", render: (v) => fmtNumber(v) },
    { key: "revenue",   label: "Revenue", align: "right", render: (v) => fmtCurrency(v) },
  ];

  // Daily view data
  const sortedDaily = [...periodDailyPush].sort((a,b) =>
    a.year!==b.year ? a.year-b.year : a.month!==b.month ? a.month-b.month : a.day-b.day
  );
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
    name:      `${d.day} ${MONTHS_ES[(d.month||1)-1]}`,
    Enviados:  d.sent  || 0,
    Aperturas: d.opens || 0,
  }));
  const totalDailySent  = slicedDays.reduce((s,d) => s+(d.sent||0), 0);
  const totalDailyOpens = slicedDays.reduce((s,d) => s+(d.opens||0), 0);
  const avgOpenRate = totalDailySent > 0 ? (totalDailyOpens/totalDailySent*100).toFixed(1) : '0.0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Rendimiento Push Notifications"
        subtitle={`${pushCampaigns.length} campañas · Mapa de rendimiento por open rate y revenue`}
        icon={Bell}
        badge="Push"
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <KPICard title="Push Enviados"      value={fmtNumber(totalPushSent)}      subtitle="Total" icon={Send} />
        <KPICard title="Compras Atribuidas" value={fmtNumber(totalPushPurchases)} subtitle="Histórico" icon={Target} accentClass="text-emerald-500" />
        <KPICard title="Revenue Push"       value={fmtCurrency(totalPushRevenue)} subtitle="Histórico" icon={Bell} accentClass="text-amber-500" />
        <KPICard title="Conv. Rate"         value={`${convRate.toFixed(3)}%`}     subtitle="envío → compra" icon={Target} accentClass="text-violet-500" />
      </div>

      {/* Toggle vista */}
      <div className="flex gap-1 mb-4 p-1 bg-muted/40 rounded-lg w-fit">
        {[
          { id: 'scatter', label: 'Mapa',   icon: Crosshair },
          { id: 'table',   label: 'Tabla',  icon: Table2 },
          { id: 'daily',   label: 'Diario', icon: CalendarDays },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${view === id ? 'bg-card shadow text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* ── Scatter ── */}
      {view === 'scatter' && scatterData.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">
            Cada punto = una campaña push · Tamaño = volumen enviado ·
            <span style={{ color: 'hsl(226,71%,40%)' }}> ■</span> Alto revenue ·
            <span style={{ color: 'hsl(213,96%,80%)' }}> ■</span> Medio ·
            <span className="text-muted-foreground"> ■</span> Bajo
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 20, bottom: 35, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis type="number" dataKey="x" name="Open Rate" unit="%"
                  tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} domain={[0, 'auto']}
                  label={{ value: 'Tasa de Apertura (%)', position: 'insideBottom', offset: -20, fontSize: 10, fill: 'hsl(220,10%,50%)' }} />
                <YAxis type="number" dataKey="y" name="Revenue"
                  tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }}
                  tickFormatter={v => `€${(v/1000).toFixed(0)}K`}
                  label={{ value: 'Revenue (€)', angle: -90, position: 'insideLeft', offset: 15, fontSize: 10, fill: 'hsl(220,10%,50%)' }} />
                <ZAxis type="number" dataKey="z" range={[30, 500]} />
                <Tooltip content={<ScatterTooltip />} />
                {avgX > 0 && <ReferenceLine x={avgX} stroke="hsl(220,13%,75%)" strokeDasharray="4 4"
                  label={{ value: `Media ${avgX.toFixed(0)}%`, position: 'top', fontSize: 9, fill: 'hsl(220,10%,50%)' }} />}
                {avgY > 0 && <ReferenceLine y={avgY} stroke="hsl(220,13%,75%)" strokeDasharray="4 4" />}
                <Scatter data={scatterData}>
                  {scatterData.map((d, i) => <Cell key={i} fill={getColor(d)} fillOpacity={0.8} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[9px]">
            <div className="text-center border border-border/40 rounded p-1.5 text-muted-foreground">↖ Alta apertura · Bajo revenue</div>
            <div className="text-center border border-violet-500/20 rounded p-1.5 bg-violet-500/5 text-violet-600">↗ Alta apertura · Alto revenue ★</div>
            <div className="text-center border border-border/40 rounded p-1.5 text-muted-foreground">↙ Baja apertura · Bajo revenue</div>
            <div className="text-center border border-amber-500/20 rounded p-1.5 bg-amber-500/5 text-amber-600">↘ Baja apertura · Alto revenue</div>
          </div>
        </div>
      )}

      {/* ── Tabla ── */}
      {view === 'table' && (
        <MiniTable columns={columns} data={pushCampaigns} maxRows={10} />
      )}

      {/* ── Diario ── */}
      {view === 'daily' && (
        <div>
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
            <p className="text-sm text-muted-foreground text-center py-8">Sin datos diarios — sync pendiente</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyChartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pushSentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={PUSH_COLOR} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={PUSH_COLOR} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false}/>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    interval={Math.max(1, Math.floor(dailyChartData.length/10))}/>
                  <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmtNumber(v)}/>
                  <Tooltip formatter={(v,n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 11 }}/>
                  <Area type="monotone" dataKey="Enviados"  stroke={PUSH_COLOR} fill="url(#pushSentGrad)" strokeWidth={1.5} dot={false}/>
                  <Area type="monotone" dataKey="Aperturas" stroke="hsl(214,95%,68%)" fill="none" strokeWidth={1.5} dot={false} strokeDasharray="4 2"/>
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
          description={`Con ~${fmtNumber(totalPushSent)} envíos y ${fmtNumber(totalPushPurchases)} compras atribuidas (${convRate.toFixed(3)}%), el ROI push es bajo versus email. Recomendación: mensajes personalizados con deep link a producto específico y reducir frecuencia para evitar fatiga.`}
        />
      </div>
    </motion.div>
  );
}
