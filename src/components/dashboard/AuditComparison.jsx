import { useState, useMemo } from "react";
import { useEmailCampaigns } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { FileSearch, ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react";
import { motion } from "framer-motion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function SortIcon({ col, sortKey, sortDir }) {
  if (sortKey !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 inline opacity-30" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 inline text-primary" />
    : <ChevronDown className="w-3 h-3 ml-1 inline text-primary" />;
}

export default function AuditComparison() {
  const { data: emailData = [] } = useEmailCampaigns();
  const [sortKey, setSortKey] = useState("revenue");
  const [sortDir, setSortDir] = useState("desc");

  const base = emailData.filter(d => d.emailName && d.sent > 0);

  const sorted = useMemo(() => {
    return [...base].sort((a, b) => {
      let aVal, bVal;
      if (sortKey === 'openRate') {
        aVal = a.sent > 0 ? a.opens / a.sent : 0;
        bVal = b.sent > 0 ? b.opens / b.sent : 0;
      } else if (sortKey === 'ctr') {
        aVal = a.sent > 0 ? a.clicks / a.sent : 0;
        bVal = b.sent > 0 ? b.clicks / b.sent : 0;
      } else if (sortKey === 'roas') {
        aVal = a.sent > 0 ? (a.revenue || 0) / a.sent : 0;
        bVal = b.sent > 0 ? (b.revenue || 0) / b.sent : 0;
      } else {
        aVal = a[sortKey] ?? 0;
        bVal = b[sortKey] ?? 0;
      }
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });
  }, [base, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const totalRevenue   = sorted.reduce((s, d) => s + (d.revenue   || 0), 0);
  const totalPurchases = sorted.reduce((s, d) => s + (d.purchases || 0), 0);

  const automation = sorted.filter(d => (d.emailName || '').startsWith('V!') || (d.emailWorkflow || '').startsWith('V!'));
  const newsletters = sorted.filter(d => !(d.emailName || '').startsWith('V!') && !(d.emailWorkflow || '').startsWith('V!'));
  const autoRevenue = automation.reduce((s, d) => s + (d.revenue || 0), 0);
  const nlRevenue   = newsletters.reduce((s, d) => s + (d.revenue || 0), 0);
  const autoSent    = automation.reduce((s, d) => s + (d.sent     || 0), 0);
  const nlSent      = newsletters.reduce((s, d) => s + (d.sent    || 0), 0);
  const autoRpc     = autoSent > 0 ? autoRevenue / autoSent : 0;
  const nlRpc       = nlSent   > 0 ? nlRevenue   / nlSent   : 0;
  const ratio       = nlRpc    > 0 ? autoRpc / nlRpc         : 0;

  const thClass = "text-[10px] uppercase tracking-widest font-semibold text-muted-foreground py-3 cursor-pointer select-none hover:text-foreground transition-colors";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <SectionHeader
        title="Auditoría de Workflows"
        subtitle={`${fmtNumber(totalPurchases)} compras · ${fmtCurrency(totalRevenue)} revenue total · Haz clic en columna para ordenar`}
        icon={FileSearch}
        badge="Auditoría"
      />

      <motion.div className="bg-card border border-border rounded-2xl overflow-hidden">
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
                const openRate = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
                const ctr      = row.sent > 0 ? (row.clicks / row.sent) * 100 : 0;
                const roas     = row.sent > 0 ? (row.revenue || 0) / row.sent : 0;
                const shortName = (row.emailName || '').replace('EMAIL| APP PUSH | PUSH ', '').replace('V! ', '');
                const isLowCtr = ctr < 1 && row.sent > 100;
                return (
                  <TableRow key={i} className="border-border/50 hover:bg-muted/30 transition-colors">
                    <TableCell className="text-sm py-2.5 font-semibold">
                      <div className="flex items-center gap-2">
                        <div className="max-w-[200px] truncate text-xs" title={row.emailName}>{shortName}</div>
                        {isLowCtr && (
                          <span className="text-[9px] bg-amber-500/15 text-amber-600 font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap">CTR bajo</span>
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
      </motion.div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type="success"
          title="Automatizaciones: Mayor Eficiencia"
          description={`Los workflows automatizados (V!) generan ${fmtCurrency(autoRevenue)} con ${fmtNumber(autoSent)} envíos (€${autoRpc.toFixed(3)}/envío). Las newsletters masivas producen ${fmtCurrency(nlRevenue)} con ${fmtNumber(nlSent)} envíos (€${nlRpc.toFixed(3)}/envío). Las automatizaciones son ${ratio.toFixed(1)}x más eficientes por envío.`}
        />
        <InsightCard
          type="info"
          title="Remarketing: Joya Oculta"
          description={`Los workflows de remarketing de producto y categoría muestran CTR excepcionales (>5%). Son los workflows con mejor ratio clicks→compra, indicando alta intención de compra. Los badges "CTR bajo" señalan workflows con <1% de CTR que pueden necesitar revisión.`}
        />
      </div>
    </motion.div>
  );
}
