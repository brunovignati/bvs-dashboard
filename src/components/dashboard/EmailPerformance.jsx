import { useState } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";
import { useEmailCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import SectionHeader from "./SectionHeader";
import MiniTable from "./MiniTable";
import InsightCard from "./InsightCard";
import { Mail, Table2, Crosshair } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

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
          <span className="font-mono font-semibold text-blue-500">{fmtCurrency(d.revenue)}</span>
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

export default function EmailPerformance() {
  const { data: emailData = [] } = useEmailCampaigns();
  const { filterByPeriod } = useComparison();
  const [view, setView] = useState('scatter');

  const allCampaigns = filterByPeriod(emailData).filter(e => e.emailName && e.sent > 0);
  const campaigns = [...allCampaigns].sort((a, b) => b.revenue - a.revenue).slice(0, 12);

  // Datos para scatter: cada campaña es un punto
  const scatterData = allCampaigns.map(c => ({
    name: c.emailName,
    openRate: (c.opens / c.sent) * 100,
    x: Math.min(100, (c.opens / c.sent) * 100),  // eje X: open rate (acotado a 100% por outliers de opens acumulados)
    y: c.revenue || 0,                      // eje Y: revenue
    z: Math.max(80, Math.min(1200, c.sent / 20)), // tamaño burbuja = volumen
    revenue: c.revenue || 0,
    sent: c.sent,
    purchases: c.purchases || 0,
    isCart: !!(c.emailWorkflow?.toLowerCase().includes('carrito') || c.emailName?.toLowerCase().includes('carrito')),
  }));

  const revs = scatterData.map(d => d.revenue).sort((a, b) => a - b);
  const q50 = revs[Math.floor(revs.length * 0.5)] || 1;
  const q75 = revs[Math.floor(revs.length * 0.75)] || 1;
  const avgX = scatterData.length > 0 ? scatterData.reduce((s, d) => s + d.x, 0) / scatterData.length : 0;
  const avgY = scatterData.length > 0 ? scatterData.reduce((s, d) => s + d.y, 0) / scatterData.length : 0;

  const getColor = (d) =>
    d.isCart   ? 'hsl(199,60%,78%)' :
    d.revenue >= q75 ? 'hsl(199,80%,64%)' :
    d.revenue >= q50 ? 'hsl(199,89%,48%)' :
    'hsl(220,13%,65%)';

  const columns = [
    { key: "emailName", label: "Campaña", bold: true,
      render: (v) => <div className="max-w-[200px] truncate text-xs" title={v}>{v}</div> },
    { key: "month", label: "Mes",
      render: (v) => <Badge variant="outline" className="text-[10px] font-mono">{monthLabel(v)}</Badge> },
    { key: "sent",  label: "Enviados",  align: "right", render: (v) => fmtNumber(v) },
    { key: "openRate", label: "Open Rate", align: "right",
      render: (_, row) => { const r = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
        return <span className={r > 45 ? "text-blue-500 font-semibold" : ""}>{r.toFixed(1)}%</span>; } },
    { key: "ctr", label: "CTR", align: "right",
      render: (_, row) => { const r = row.sent > 0 ? (row.clicks / row.sent) * 100 : 0; return `${r.toFixed(2)}%`; } },
    { key: "purchases", label: "Compras", align: "right", render: (v) => fmtNumber(v) },
    { key: "revenue",   label: "Revenue", align: "right", render: (v) => fmtCurrency(v) },
    { key: "rpc", label: "Rev/Compra", align: "right",
      render: (_, row) => { const rpc = row.purchases > 0 ? row.revenue / row.purchases : 0; return `€${rpc.toFixed(0)}`; } },
  ];

  const cartEmails     = campaigns.filter(e => e.emailWorkflow?.includes('Carrito'));
  const nlEmails       = campaigns.filter(e => !e.emailWorkflow?.includes('Carrito'));
  const cartRevenue    = cartEmails.reduce((s, e) => s + e.revenue, 0);
  const nlRevenue      = nlEmails.reduce((s, e) => s + e.revenue, 0);
  const topCampaign    = scatterData.sort((a, b) => b.revenue - a.revenue)[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Rendimiento Email Marketing"
        subtitle={`${allCampaigns.length} campañas · Mapa de rendimiento por open rate y revenue`}
        icon={Mail}
        badge="Email"
      />

      {/* Toggle vista */}
      <div className="flex gap-1 mb-4 p-1 bg-muted/40 rounded-lg w-fit">
        {[
          { id: 'scatter', label: 'Mapa', icon: Crosshair },
          { id: 'table',   label: 'Tabla', icon: Table2   },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${view === id ? 'bg-card shadow text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* ── SCATTER: Mapa de rendimiento ── */}
      {view === 'scatter' && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">
            Cada punto = una campaña · Tamaño = volumen enviado · <span style={{ color: 'hsl(199,60%,78%)' }}>■</span> Carrito abandonado
            · <span style={{ color: 'hsl(199,80%,64%)' }}>■</span> Alto revenue · <span style={{ color: 'hsl(199,89%,48%)' }}>■</span> Medio
            · <span className="text-muted-foreground">■</span> Bajo
          </p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 15, right: 20, bottom: 35, left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" />
                <XAxis type="number" dataKey="x" name="Open Rate" unit="%"
                  tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} domain={[0, 100]} allowDataOverflow
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
            <div className="text-center border border-blue-500/20 rounded p-1.5 bg-blue-500/5 text-blue-600">↗ Alta apertura · Alto revenue ★</div>
            <div className="text-center border border-border/40 rounded p-1.5 text-muted-foreground">↙ Baja apertura · Bajo revenue</div>
            <div className="text-center border border-slate-500/20 rounded p-1.5 bg-slate-500/5 text-slate-600">↘ Baja apertura · Alto revenue</div>
          </div>
          {topCampaign && (
            <p className="text-[10px] text-muted-foreground mt-2">
              Campaña top: <span className="font-semibold text-foreground">{topCampaign.name}</span> — {fmtCurrency(topCampaign.revenue)} · {topCampaign.openRate.toFixed(1)}% apertura
            </p>
          )}
        </div>
      )}

      {/* ── TABLA ── */}
      {view === 'table' && (
        <MiniTable columns={columns} data={campaigns} maxRows={12} />
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type="success"
          title="Carritos Abandonados: Motor de Revenue"
          description={`Los emails de carrito abandonado generan ${fmtCurrency(cartRevenue)} con tasas de apertura superiores al 50%. La secuencia CA1→CA2→CA3 muestra un funnel efectivo con decay natural.`}
        />
        <InsightCard
          type="info"
          title="Newsletters vs Automation"
          description={`Las newsletters masivas generan ${fmtCurrency(nlRevenue)} pero con CTR más bajo (~1.1%). Optimizar CTA y personalización podría mejorar la conversión significativamente.`}
        />
      </div>
    </motion.div>
  );
}
