import { useState, useMemo } from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer, ReferenceLine } from "recharts";
import { useEmailCampaigns } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber, normalCDF } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { FileSearch, ChevronUp, ChevronDown, ChevronsUpDown, FlaskConical, Crosshair, Table2 } from "lucide-react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// ─── Sort icon ─────────────────────────────────────────────
function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 inline opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 inline text-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 inline text-primary" />;
}

// ─── Bayesian A/B helpers ───────────────────────────────────
function bayesAB(succA, nA, succB, nB) {
  if (nA < 5 || nB < 5) return null;
  const pA  = (succA + 1) / (nA + 2);
  const pB  = (succB + 1) / (nB + 2);
  const seA = Math.sqrt((pA * (1 - pA)) / (nA + 2));
  const seB = Math.sqrt((pB * (1 - pB)) / (nB + 2));
  const denom = Math.sqrt(seA ** 2 + seB ** 2);
  if (denom === 0) return null;
  const z = (pA - pB) / denom;
  return { pWin: normalCDF(z), pA, pB };
}

function probLabel(p) {
  if (p >= 0.95) return { text: "Ganador claro ✓",      color: "text-emerald-500" };
  if (p >= 0.85) return { text: "Probablemente mejor",  color: "text-emerald-400" };
  if (p >= 0.70) return { text: "Ligeramente mejor",    color: "text-amber-400" };
  if (p <= 0.05) return { text: "Claramente peor ✗",    color: "text-red-500" };
  if (p <= 0.15) return { text: "Probablemente peor",   color: "text-red-400" };
  if (p <= 0.30) return { text: "Ligeramente peor",     color: "text-amber-400" };
  return { text: "Sin diferencia clara",                  color: "text-muted-foreground" };
}

function BayesCard({ title, pWin, pA, pB, labelA, labelB, formatRate }) {
  if (pWin === null) return null;
  const { text, color } = probLabel(pWin);
  const pct      = (pWin * 100).toFixed(1);
  const barWidth = Math.max(0, Math.min(100, pWin * 100));
  return (
    <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-4 h-4 text-primary flex-shrink-0" />
        <p className="text-xs font-semibold">{title}</p>
      </div>
      <div className="space-y-1.5">
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>{labelA}: <strong className="text-foreground">{formatRate(pA)}</strong></span>
          <span>{labelB}: <strong className="text-foreground">{formatRate(pB)}</strong></span>
        </div>
        <div className="relative h-3 rounded-full bg-muted overflow-hidden">
          <div className="absolute top-0 left-0 h-full rounded-full transition-all"
            style={{ width: `${barWidth}%`, background: barWidth >= 70 ? '#10b981' : barWidth <= 30 ? '#ef4444' : '#f59e0b' }} />
          <div className="absolute top-0 left-1/2 h-full w-px bg-border/60" />
        </div>
        <div className="flex justify-between items-center">
          <span className={`text-xs font-bold ${color}`}>P(Auto &gt; NL) = {pct}%</span>
          <span className={`text-[10px] font-medium ${color}`}>{text}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Scatter tooltip ────────────────────────────────────────
const ScatterTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl max-w-56">
      <p className="text-xs font-semibold mb-2 leading-tight line-clamp-2">{d.name}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Open Rate</span>
          <span className="font-mono">{d.openRate.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">CTR</span>
          <span className="font-mono">{d.ctr.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Revenue</span>
          <span className="font-mono font-semibold text-emerald-500">{fmtCurrency(d.revenue)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Enviados</span>
          <span className="font-mono">{fmtNumber(d.sent)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-muted-foreground">Tipo</span>
          <span className="font-mono">{d.isAuto ? 'Automatización' : 'Newsletter'}</span>
        </div>
      </div>
    </div>
  );
};

// ─── Componente principal ───────────────────────────────────
export default function AuditComparison() {
  const { data: emailData = [] } = useEmailCampaigns();
  const [view, setView] = useState('scatter');
  const [sortKey, setSortKey] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");

  const DATE_RE = /\d{2}[-./]\d{2}[-./]\d{2,4}/;
  const isNewsletter = (d) => DATE_RE.test(d.emailName || '') || DATE_RE.test(d.emailWorkflow || '');

  const base   = emailData.filter(d => d.emailName && d.sent > 0);
  const sorted = useMemo(() => {
    return [...base].sort((a, b) => {
      let aVal, bVal;
      if (sortKey === 'openRate') { aVal = a.sent > 0 ? a.opens / a.sent : 0; bVal = b.sent > 0 ? b.opens / b.sent : 0; }
      else if (sortKey === 'ctr')  { aVal = a.sent > 0 ? a.clicks / a.sent : 0; bVal = b.sent > 0 ? b.clicks / b.sent : 0; }
      else if (sortKey === 'roas') { aVal = a.sent > 0 ? (a.revenue || 0) / a.sent : 0; bVal = b.sent > 0 ? (b.revenue || 0) / b.sent : 0; }
      else { aVal = a[sortKey] ?? 0; bVal = b[sortKey] ?? 0; }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [base, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const totalRevenue   = sorted.reduce((s, d) => s + (d.revenue   || 0), 0);
  const totalPurchases = sorted.reduce((s, d) => s + (d.purchases || 0), 0);

  const automation = sorted.filter(d => !isNewsletter(d));
  const newsletters = sorted.filter(d => isNewsletter(d));
  const autoRevenue = automation.reduce((s, d) => s + (d.revenue || 0), 0);
  const nlRevenue   = newsletters.reduce((s, d) => s + (d.revenue || 0), 0);
  const autoSent    = automation.reduce((s, d) => s + (d.sent     || 0), 0);
  const nlSent      = newsletters.reduce((s, d) => s + (d.sent    || 0), 0);
  const autoPurchases = automation.reduce((s, d) => s + (d.purchases || 0), 0);
  const nlPurchases   = newsletters.reduce((s, d) => s + (d.purchases || 0), 0);
  const autoOpens   = automation.reduce((s, d) => s + (d.opens || 0), 0);
  const nlOpens     = newsletters.reduce((s, d) => s + (d.opens  || 0), 0);
  const autoRpc = autoSent > 0 ? autoRevenue / autoSent : 0;
  const nlRpc   = nlSent   > 0 ? nlRevenue   / nlSent   : 0;
  const ratio   = nlRpc    > 0 ? autoRpc / nlRpc         : 0;
  const convAB  = bayesAB(autoPurchases, autoSent, nlPurchases, nlSent);
  const openAB  = bayesAB(autoOpens,     autoSent, nlOpens,     nlSent);

  // Scatter: X=openRate, Y=revenue, Z=sent, color by type
  const scatterData = base.map(d => ({
    name:     d.emailName || '',
    openRate: d.sent > 0 ? (d.opens / d.sent) * 100 : 0,
    ctr:      d.sent > 0 ? (d.clicks / d.sent) * 100 : 0,
    x:        d.sent > 0 ? (d.opens / d.sent) * 100 : 0,
    y:        d.revenue || 0,
    z:        Math.max(50, Math.min(800, d.sent / 20)),
    revenue:  d.revenue || 0,
    sent:     d.sent,
    purchases: d.purchases || 0,
    isAuto:   !isNewsletter(d),
  }));
  const avgX = scatterData.length > 0 ? scatterData.reduce((s, d) => s + d.x, 0) / scatterData.length : 0;
  const avgY = scatterData.length > 0 ? scatterData.reduce((s, d) => s + d.y, 0) / scatterData.length : 0;
  const getColor = (d) =>
    d.isAuto ? 'hsl(160,84%,39%)' : 'hsl(217,91%,60%)';

  const thClass = "text-[10px] uppercase tracking-widest font-semibold text-muted-foreground py-3 cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Auditoría de Workflows"
        subtitle={`${fmtNumber(totalPurchases)} compras · ${fmtCurrency(totalRevenue)} revenue total · ${base.length} campañas`}
        icon={FileSearch}
        badge="Auditoría"
      />

      {/* Toggle vista */}
      <div className="flex gap-1 mb-4 p-1 bg-muted/40 rounded-lg w-fit">
        {[
          { id: 'scatter', label: 'Mapa',  icon: Crosshair },
          { id: 'table',   label: 'Tabla', icon: Table2 },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setView(id)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md transition-colors ${view === id ? 'bg-card shadow text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* ── Scatter: mapa de rendimiento ── */}
      {view === 'scatter' && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1">
            Cada punto = un workflow · Tamaño = volumen enviado ·
            <span style={{ color: 'hsl(160,84%,39%)' }}> ■</span> Automatización ·
            <span style={{ color: 'hsl(217,91%,60%)' }}> ■</span> Newsletter
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
                  {scatterData.map((d, i) => <Cell key={i} fill={getColor(d)} fillOpacity={0.82} />)}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2 text-[9px]">
            <div className="text-center border border-border/40 rounded p-1.5 text-muted-foreground">↖ Alta apertura · Bajo revenue</div>
            <div className="text-center border border-emerald-500/20 rounded p-1.5 bg-emerald-500/5 text-emerald-600">↗ Alta apertura · Alto revenue ★</div>
            <div className="text-center border border-border/40 rounded p-1.5 text-muted-foreground">↙ Baja apertura · Bajo revenue</div>
            <div className="text-center border border-amber-500/20 rounded p-1.5 bg-amber-500/5 text-amber-600">↘ Baja apertura · Alto revenue</div>
          </div>
        </div>
      )}

      {/* ── Tabla ordenable ── */}
      {view === 'table' && (
        <div className="rounded-2xl overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className={thClass} onClick={() => handleSort('emailName')}>
                    Workflow <SortIcon col="emailName" sortKey={sortKey} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className={`${thClass} text-right`} onClick={() => handleSort('sent')}>
                    Enviados <SortIcon col="sent" sortKey={sortKey} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className={`${thClass} text-right`} onClick={() => handleSort('openRate')}>
                    Open Rate <SortIcon col="openRate" sortKey={sortKey} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className={`${thClass} text-right`} onClick={() => handleSort('ctr')}>
                    CTR <SortIcon col="ctr" sortKey={sortKey} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className={`${thClass} text-right`} onClick={() => handleSort('purchases')}>
                    Compras <SortIcon col="purchases" sortKey={sortKey} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className={`${thClass} text-right`} onClick={() => handleSort('revenue')}>
                    Revenue <SortIcon col="revenue" sortKey={sortKey} sortDir={sortDir} />
                  </TableHead>
                  <TableHead className={`${thClass} text-right`} onClick={() => handleSort('roas')}>
                    €/Envío <SortIcon col="roas" sortKey={sortKey} sortDir={sortDir} />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.slice(0, 15).map((row, i) => {
                  const openRate  = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
                  const ctr       = row.sent > 0 ? (row.clicks / row.sent) * 100 : 0;
                  const roas      = row.sent > 0 ? (row.revenue || 0) / row.sent : 0;
                  const shortName = (row.emailName || '').replace('EMAIL| APP PUSH | PUSH ', '').replace('V! ', '');
                  const isLowCtr  = ctr < 1 && row.sent > 100;
                  return (
                    <TableRow key={i} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="text-sm py-2.5 font-semibold">
                        <div className="flex items-center gap-2">
                          <div className="max-w-[200px] truncate text-xs" title={row.emailName}>{shortName}</div>
                          {isLowCtr && (
                            <span className="text-[9px] bg-amber-500/15 text-amber-600 font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap">CTR bajo</span>
                          )}
                          {!isNewsletter(row) && (
                            <span className="text-[9px] bg-emerald-500/15 text-emerald-600 font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap">Auto</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs py-2.5">{fmtNumber(row.sent)}</TableCell>
                      <TableCell className={`text-right font-mono text-xs py-2.5 ${openRate > 45 ? 'text-emerald-500 font-semibold' : ''}`}>
                        {openRate.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs py-2.5 ${isLowCtr ? 'text-amber-500' : ''}`}>
                        {ctr.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs py-2.5">{fmtNumber(row.purchases)}</TableCell>
                      <TableCell className="text-right font-mono text-xs py-2.5 font-semibold">{fmtCurrency(row.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs py-2.5">€{roas.toFixed(3)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Bayesian A/B */}
      {view === 'table' && (convAB || openAB) && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" />
            Comparación Bayesiana: Automatizaciones vs Newsletters
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {convAB && <BayesCard title="Tasa de Conversión (compras / envíos)" pWin={convAB.pWin} pA={convAB.pA} pB={convAB.pB}
              labelA="Automatizaciones" labelB="Newsletters" formatRate={(p) => `${(p * 100).toFixed(3)}%`} />}
            {openAB && <BayesCard title="Tasa de Apertura (opens / envíos)" pWin={openAB.pWin} pA={openAB.pA} pB={openAB.pB}
              labelA="Automatizaciones" labelB="Newsletters" formatRate={(p) => `${(p * 100).toFixed(1)}%`} />}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type="success"
          title="Automatizaciones: Mayor Eficiencia"
          description={`Los workflows automatizados generan ${fmtCurrency(autoRevenue)} con ${fmtNumber(autoSent)} envíos (€${autoRpc.toFixed(3)}/envío). Las newsletters producen ${fmtCurrency(nlRevenue)} con ${fmtNumber(nlSent)} envíos (€${nlRpc.toFixed(3)}/envío). Las automatizaciones son ${ratio > 0 ? ratio.toFixed(1) + 'x' : 'N/A'} más eficientes por envío.`}
        />
        <InsightCard
          type="info"
          title="Remarketing: Joya Oculta"
          description={`Los workflows de remarketing muestran CTR excepcionales (>5%). Son los workflows con mejor rItio clicks→compra. En el Mapa, los puntos verdes arriba-derecha son los workflows estrella.`}
        />
      </div>
    </motion.div>
  );
}
