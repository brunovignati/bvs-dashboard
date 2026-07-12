import { useStickyData } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Globe, BarChart2 } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from "recharts";

const COLORS = [
  'hsl(200,95%,40%)',
  'hsl(200,85%,54%)',
  'hsl(200,85%,54%)',
  'hsl(200,72%,64%)',
  'hsl(200,90%,38%)',
];

export default function StickyWebContent() {
  const { data: stickyData = [] } = useStickyData();

  const topSticky = [...stickyData].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const best = topSticky[0];

  // Datos para el ranking horizontal de barras
  const barData = topSticky.map((s, i) => ({
    name:     s.workflow?.replace('STICKY | ', '').replace('WEB CONTENT | ', '') || `Canal ${i + 1}`,
    fullName: s.workflow || `Canal ${i + 1}`,
    revenue:  s.revenue  || 0,
    clicks:   s.clicks   || 0,
    opens:    s.opens    || 0,
    convRate: s.convRate || 0,
    color:    COLORS[i % COLORS.length],
  }));

  const totalRevenue = barData.reduce((s, d) => s + d.revenue, 0);
  const totalClicks  = barData.reduce((s, d) => s + d.clicks,  0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Sticky Bars & Web Content"
        subtitle={`${barData.length} canales · ${fmtCurrency(totalRevenue)} revenue total · ${fmtNumber(totalClicks)} clics`}
        icon={Globe}
        badge="Web"
      />

      {topSticky.length === 0 ? (
        <p className="text-muted-foreground text-sm">Cargando datos...</p>
      ) : (
        <>
          {/* ── Ranking horizontal por revenue ── */}
          <div className="mb-6">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Ranking por Revenue
            </p>
            <div className="space-y-3">
              {barData.map((d, i) => {
                const pct = totalRevenue > 0 ? (d.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-32 text-[10px] text-right text-muted-foreground shrink-0 font-medium truncate" title={d.fullName}>
                      {d.name}
                    </div>
                    <div className="flex-1 bg-muted/40 rounded-full h-7 relative overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 2)}%` }}
                        transition={{ duration: 0.7, delay: i * 0.1 }}
                        className="h-full rounded-full flex items-center pl-3"
                        style={{ backgroundColor: d.color + 'cc' }}
                      >
                        <span className="text-[10px] font-semibold text-white whitespace-nowrap">
                          {fmtCurrency(d.revenue)}
                        </span>
                      </motion.div>
                    </div>
                    <div className="w-10 text-[10px] text-muted-foreground text-right shrink-0">
                      {pct.toFixed(0)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Gráfico comparativo: clicks vs conversion ── */}
          {barData.length > 1 && (
            <div className="pt-4 border-t border-border mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Clics por canal</p>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ top: 0, right: 60, left: 100, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                      tickFormatter={v => fmtNumber(v)} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false} width={95} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload;
                        return (
                          <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl max-w-52">
                            <p className="text-xs font-semibold mb-1.5 line-clamp-2">{d.fullName}</p>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Clics</span><span className="font-mono">{fmtNumber(d.clicks)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Vistas</span><span className="font-mono">{fmtNumber(d.opens)}</span></div>
                              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Conv. Rate</span><span className="font-mono">{Number(d.convRate).toFixed(2)}%</span></div>
                              <div className="flex justify-between gap-3"><span className="text-muted-foreground">Revenue</span><span className="font-mono text-blue-500 font-semibold">{fmtCurrency(d.revenue)}</span></div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="clicks" radius={[0, 3, 3, 0]} maxBarSize={18}>
                      {barData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.85} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── Cards de métricas ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {topSticky.map((s, i) => (
              <div key={i} className="p-4 bg-muted/50 rounded-xl border border-border/40">
                <p className="text-xs font-semibold mb-3 truncate" title={s.workflow}>{s.workflow}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Vistas</p>
                    <p className="text-lg font-bold font-heading">{fmtNumber(s.opens)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Clics</p>
                    <p className="text-lg font-bold font-heading">{fmtNumber(s.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Conv. Rate</p>
                    <p className="text-lg font-bold font-heading text-primary">
                      {s.convRate !== undefined ? `${Number(s.convRate).toFixed(2)}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
                    <p className="text-lg font-bold font-heading text-blue-500">{fmtCurrency(s.revenue)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {best && (
            <InsightCard
              type="success"
              title="Canal Web: Máquina de Conversión"
              description={`El canal principal "${best.workflow}" genera ${fmtNumber(best.clicks)} clics con un ${Number(best.convRate || 0).toFixed(2)}% de conversión. Con ${fmtCurrency(best.revenue)} en revenue, es un canal de adquisición altamente rentable con cero coste de envío.`}
            />
          )}
        </>
      )}
    </motion.div>
  );
}
