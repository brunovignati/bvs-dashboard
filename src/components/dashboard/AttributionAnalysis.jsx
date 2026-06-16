import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { monthLabel, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { GitBranch } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ["hsl(217,91%,60%)", "hsl(280,65%,60%)", "hsl(160,84%,39%)", "hsl(35,92%,56%)"];

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

export default function AttributionAnalysis() {
  // ✅ MIGRADO: datos reales de Supabase en vez de nutraceuticosMonthly hardcodeado
  const { data: rawMetrics = [] } = useMonthlyMetrics();
  const data = [...rawMetrics].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  if (data.length === 0) return null;

  const chartData = data.map(d => ({
    name: `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
    Email: d.emailAttr || 0,
    Web:   d.webAttr   || 0,
    Push:  d.pushAttr  || 0,
  }));

  const totEmail = data.reduce((s, d) => s + (d.emailAttr || 0), 0);
  const totWeb   = data.reduce((s, d) => s + (d.webAttr   || 0), 0);
  const totPush  = data.reduce((s, d) => s + (d.pushAttr  || 0), 0);
  const totAll   = totEmail + totWeb + totPush;

  const pieData = [
    { name: "Email",       value: totEmail },
    { name: "Web Content", value: totWeb   },
    { name: "Push",        value: totPush  },
  ];

  const firstHalf  = data.slice(0, Math.max(1, Math.floor(data.length / 2)));
  const lastHalf   = data.slice(-Math.max(1, Math.floor(data.length / 2)));
  const emailFirst = firstHalf.reduce((s, d) => s + (d.emailAttr || 0), 0) / firstHalf.length;
  const emailLast  = lastHalf.reduce((s, d)  => s + (d.emailAttr || 0), 0) / lastHalf.length;
  const webFirst   = firstHalf.reduce((s, d) => s + (d.webAttr   || 0), 0) / firstHalf.length;
  const webLast    = lastHalf.reduce((s, d)  => s + (d.webAttr   || 0), 0) / lastHalf.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Atribución Multicanal"
        subtitle={`Nutracéuticos BVS · ${data.length} meses · Correlación entre canales`}
        icon={GitBranch}
        badge="Correlación"
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="emailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS[0]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="webGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={COLORS[2]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="Email" stroke={COLORS[0]} fill="url(#emailGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="Web"   stroke={COLORS[2]} fill="url(#webGrad)"   strokeWidth={2} />
              <Area type="monotone" dataKey="Push"  stroke={COLORS[1]} fill="transparent"     strokeWidth={1.5} strokeDasharray="4 4" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div className="h-44 w-44">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                </Pie>
                <Tooltip formatter={(v) => fmtNumber(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 mt-2">
            {pieData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-mono font-medium ml-auto">
                  {totAll > 0 ? ((d.value / totAll) * 100).toFixed(1) : '0'}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type={emailLast < emailFirst ? "warning" : "success"}
          title="Tendencia Email"
          description={`La atribución por email ha pasado de ~${Math.round(emailFirst)} a ~${Math.round(emailLast)} compras/mes (${emailLast < emailFirst ? 'descenso' : 'aumento'} de ${emailFirst > 0 ? Math.abs(((emailLast - emailFirst) / emailFirst) * 100).toFixed(0) : 0}%). Considerar optimización de subject lines y segmentación.`}
        />
        <InsightCard
          type={webLast > webFirst ? "success" : "info"}
          title="Crecimiento Web Content"
          description={`La atribución web pasó de ~${Math.round(webFirst)} a ~${Math.round(webLast)} compras/mes. ${webFirst > 0 ? `(+${(((webLast - webFirst) / webFirst) * 100).toFixed(0)}%)` : ''} Los formularios y sticky bars están generando un impacto creciente en la conversión.`}
        />
      </div>
    </motion.div>
  );
}
