import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useCartAbandonment } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { ShoppingCart } from "lucide-react";
import { motion } from "framer-motion";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl">
      <p className="text-xs font-semibold mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-mono font-medium">
            {p.name === 'Revenue' ? `€${Number(p.value).toLocaleString('es-ES')}` : fmtNumber(p.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

function cleanName(name = '') {
  return name
    .replace(/^WF \| /i, '')
    .replace(/^CONVERSION - /i, '')
    .replace(/\[MEJORADO\]/gi, '')
    .replace(/\[TEST A\/B\]/gi, '[A/B]')
    .replace(/SERIE 3 EMAILS/gi, 'CA')
    .replace(/RECUPERACIÓN DE CARRITOS ABANDONADOS/gi, 'Carrito')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 50);
}

export default function CartRecoveryFunnel() {
  const { data: cartAbandonment = [] } = useCartAbandonment();
  const { filterByPeriod } = useComparison();

  const cartData = filterByPeriod(cartAbandonment);
  if (cartData.length === 0) return null;

  const totalRevenue   = cartData.reduce((s, d) => s + (d.revenue   || 0), 0);
  const totalPurchases = cartData.reduce((s, d) => s + (d.purchases || 0), 0);
  const avgTicket      = totalPurchases > 0 ? totalRevenue / totalPurchases : 0;

  // ── Top workflows agregados ──────────────────────────────
  const byWorkflow = {};
  for (const d of cartData) {
    const key = d.emailName || 'Sin nombre';
    if (!byWorkflow[key]) byWorkflow[key] = { name: cleanName(key), revenue: 0, purchases: 0, sent: 0, opens: 0 };
    byWorkflow[key].revenue   += d.revenue   || 0;
    byWorkflow[key].purchases += d.purchases || 0;
    byWorkflow[key].sent      += d.sent      || 0;
    byWorkflow[key].opens     += d.opens     || 0;
  }
  const topWorkflows = Object.values(byWorkflow)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  // ── Evolución mensual ────────────────────────────────────
  const byMonth = {};
  for (const d of cartData) {
    const key = `${d.year}-${String(d.month).padStart(2, '0')}`;
    if (!byMonth[key]) byMonth[key] = { name: `${monthLabel(d.month)} ${String(d.year).slice(2)}`, revenue: 0, purchases: 0 };
    byMonth[key].revenue   += d.revenue   || 0;
    byMonth[key].purchases += d.purchases || 0;
  }
  const monthlyData = Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Recuperación de Carritos Abandonados"
        subtitle={`${fmtNumber(totalPurchases)} compras recuperadas · ${fmtCurrency(totalRevenue)} revenue · Ticket medio €${avgTicket.toFixed(0)}`}
        icon={ShoppingCart}
        badge="Carritos"
      />

      {/* KPIs rápidos */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Revenue total</p>
          <p className="text-lg font-bold font-heading text-emerald-500">{fmtCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Compras recuperadas</p>
          <p className="text-lg font-bold font-heading">{fmtNumber(totalPurchases)}</p>
        </div>
        <div className="bg-muted/50 rounded-xl p-3 text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Ticket medio</p>
          <p className="text-lg font-bold font-heading">€{avgTicket.toFixed(0)}</p>
        </div>
      </div>

      {/* Evolución mensual */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Revenue mensual de carritos recuperados</p>
      <div className="h-48 mb-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
              interval={Math.max(0, Math.floor(monthlyData.length / 8))} />
            <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="revenue" name="Revenue" fill="hsl(214,95%,68%)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top workflows */}
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Top workflows por revenue acumulado</p>
      <div className="space-y-2">
        {topWorkflows.map((wf, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-4 text-[10px] text-muted-foreground text-right shrink-0">{i + 1}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs truncate">{wf.name}</span>
                <span className="text-xs font-mono font-semibold shrink-0 text-emerald-500">{fmtCurrency(wf.revenue)}</span>
              </div>
              <div className="mt-1 h-1.5 bg-muted/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500/70 rounded-full"
                  style={{ width: `${totalRevenue > 0 ? (wf.revenue / topWorkflows[0].revenue) * 100 : 0}%` }}
                />
              </div>
              <div className="flex gap-3 mt-0.5">
                <span className="text-[9px] text-muted-foreground">{fmtNumber(wf.purchases)} compras</span>
                {wf.sent > 0 && <span className="text-[9px] text-muted-foreground">{((wf.opens / wf.sent) * 100).toFixed(0)}% apertura</span>}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4">
        <InsightCard
          type="success"
          title="Motor de Revenue"
          description={`Los carritos abandonados recuperan ${fmtCurrency(totalRevenue)} con un ticket medio de €${avgTicket.toFixed(0)}. La secuencia de emails (CA1→CA2→CA3) es uno de los workflows con mayor ROI de todo el sistema.`}
        />
      </div>
    </motion.div>
  );
}
