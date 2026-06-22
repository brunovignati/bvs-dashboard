import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { monthLabel, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { GitBranch, Info } from "lucide-react";
import { motion } from "framer-motion";

const COLORS = ["hsl(217,91%,60%)", "hsl(280,65%,60%)", "hsl(160,84%,39%)"];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">{Number(p.value).toLocaleString('es-ES')} compras</span>
        </div>
      ))}
    </div>
  );
};

export default function AttributionAnalysis() {
  const { data: rawMetrics = [] } = useMonthlyMetrics();
  const data = [...rawMetrics].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  if (data.length === 0) return null;

  const chartData = data.map(d => ({
    name: `${monthLabel(d.month)} ${String(d.year).slice(2)}`,
    Email: d.emailAttr || 0,
    Web:   d.webAttr   || 0,
    Push:  d.pushAttr  || 0,
  }));

  // Para el pie: compras atribuidas por canal (last-touch de Connectif)
  // Cada compra va a UN solo canal — no se suman a revenue total
  const totEmail = data.reduce((s, d) => s + (d.emailAttr || 0), 0);
  const totWeb   = data.reduce((s, d) => s + (d.webAttr   || 0), 0);
  const totPush  = data.reduce((s, d) => s + (d.pushAttr  || 0), 0);
  const totAll   = totEmail + totWeb + totPush;

  const pieData = [
    { name: "Email",       value: totEmail },
    { name: "Web Content", value: totWeb   },
    { name: "Push",        value: totPush  },
  ].filter(d => d.value > 0);

  const firstHalf  = data.slice(0, Math.max(1, Math.floor(data.length / 2)));
  const lastHalf   = data.slice(-Math.max(1, Math.floor(data.length / 2)));
  const emailFirst = firstHalf.reduce((s, d) => s + (d.emailAttr || 0), 0) / firstHalf.length;
  const emailLast  = lastHalf.reduce((s, d)  => s + (d.emailAttr || 0), 0) / lastHalf.length;

  const topChannel = pieData.length > 0 ? [...pieData].sort((a, b) => b.value - a.value)[0] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Atribución Multicanal"
        subtitle={`Nutracéuticos BVS · ${data.length} meses · Compras atribuidas por canal (last-touch)`}
        icon={GitBranch}
        badge="Last-touch"
      />

      {/* Nota de caveat */}
      <div className="flex items-start gap-2 mb-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
        <Info className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          <span className="font-semibold text-foreground">Modelo last-touch:</span> Connectif asigna cada compra al último canal con el que interactuó el cliente. Los tres canales son <em>mutuamente excluyentes</em> — no se suman al revenue total, representan qué canal tuvo el último contacto.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="Email" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="Web"   stroke={COLORS[2]} strokeWidth={2} dot={{ r: 2 }} />
              <Line type="monotone" dataKey="Push"  stroke={COLORS[1]} strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col items-center justify-center">
          {pieData.length > 0 && (
            <>
              <div className="h-44 w-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                      {pieData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => `${fmtNumber(v)} compras`} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <p className="text-[9px] text-muted-foreground text-center mb-2">Compras atribuidas por canal</p>
              <div className="space-y-1.5">
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
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type={emailLast < emailFirst ? "warning" : "success"}
          title="Tendencia Email"
          description={`La atribución por email pasó de ~${Math.round(emailFirst)} a ~${Math.round(emailLast)} compras/mes (${emailLast < emailFirst ? 'descenso' : 'aumento'} del ${emailFirst > 0 ? Math.abs(((emailLast - emailFirst) / emailFirst) * 100).toFixed(0) : 0}%). Indica cuántas compras tuvieron email como último contacto.`}
        />
        <InsightCard
          type="info"
          title="Canal dominante"
          description={topChannel
            ? `${topChannel.name} es el canal con más compras atribuidas: ${fmtNumber(topChannel.value)} compras en el período (${totAll > 0 ? ((topChannel.value / totAll) * 100).toFixed(0) : 0}% del total atribuido). Recuerda que esto no es revenue adicional — es el canal que "cierra" la venta.`
            : 'Sin datos de atribución suficientes.'}
        />
      </div>
    </motion.div>
  );
}
