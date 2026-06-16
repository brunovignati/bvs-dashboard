import { useEmailCampaigns } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import MiniTable from "./MiniTable";
import InsightCard from "./InsightCard";
import { FileSearch } from "lucide-react";
import { motion } from "framer-motion";

export default function AuditComparison() {
  // ✅ MIGRADO: datos reales de Supabase
  const { data: emailData = [] } = useEmailCampaigns();

  // Filtrar solo campañas con datos reales y ordenar por revenue
  const sorted = [...emailData]
    .filter(d => d.emailName && d.sent > 0)
    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0));

  const columns = [
    {
      key: "emailName",
      label: "Workflow",
      bold: true,
      render: (v) => {
        const short = (v || '').replace('EMAIL| APP PUSH | PUSH ', '').replace('V! ', '');
        return <div className="max-w-[200px] truncate text-xs" title={v}>{short}</div>;
      },
    },
    { key: "sent",      label: "Enviados",  align: "right", render: (v) => fmtNumber(v) },
    {
      key: "openRate",
      label: "Open Rate",
      align: "right",
      render: (_, row) => {
        const rate = row.sent > 0 ? (row.opens / row.sent) * 100 : 0;
        return <span className={rate > 45 ? "text-emerald-500 font-semibold" : ""}>{rate.toFixed(1)}%</span>;
      },
    },
    {
      key: "ctr",
      label: "CTR",
      align: "right",
      render: (_, row) => {
        const rate = row.sent > 0 ? (row.clicks / row.sent) * 100 : 0;
        return `${rate.toFixed(2)}%`;
      },
    },
    { key: "purchases", label: "Compras",  align: "right", render: (v) => fmtNumber(v) },
    { key: "revenue",   label: "Revenue",  align: "right", render: (v) => fmtCurrency(v) },
    {
      key: "roas",
      label: "Rev/Envío",
      align: "right",
      render: (_, row) => {
        const roas = row.sent > 0 ? (row.revenue || 0) / row.sent : 0;
        return `€${roas.toFixed(3)}`;
      },
    },
  ];

  const totalRevenue   = sorted.reduce((s, d) => s + (d.revenue   || 0), 0);
  const totalPurchases = sorted.reduce((s, d) => s + (d.purchases || 0), 0);

  const automation = sorted.filter(d => (d.emailName || '').startsWith('V!') || (d.emailWorkflow || '').startsWith('V!'));
  const newsletters = sorted.filter(d => !(d.emailName || '').startsWith('V!') && !(d.emailWorkflow || '').startsWith('V!'));
  const autoRevenue = automation.reduce((s, d) => s + (d.revenue || 0), 0);
  const nlRevenue   = newsletters.reduce((s, d) => s + (d.revenue || 0), 0);
  const autoSent    = automation.reduce((s, d) => s + (d.sent     || 0), 0);
  const nlSent      = newsletters.reduce((s, d) => s + (d.sent    || 0), 0);

  const autoRpc = autoSent > 0 ? autoRevenue / autoSent : 0;
  const nlRpc   = nlSent   > 0 ? nlRevenue   / nlSent   : 0;
  const ratio   = nlRpc    > 0 ? autoRpc / nlRpc         : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <SectionHeader
        title="Auditoría de Workflows"
        subtitle={`${fmtNumber(totalPurchases)} compras · ${fmtCurrency(totalRevenue)} revenue total`}
        icon={FileSearch}
        badge="Auditoría"
      />

      <MiniTable columns={columns} data={sorted} maxRows={12} />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <InsightCard
          type="success"
          title="Automatizaciones: Mayor Eficiencia"
          description={`Los workflows automatizados (V!) generan ${fmtCurrency(autoRevenue)} con ${fmtNumber(autoSent)} envíos (€${autoRpc.toFixed(3)}/envío). Las newsletters masivas producen ${fmtCurrency(nlRevenue)} con ${fmtNumber(nlSent)} envíos (€${nlRpc.toFixed(3)}/envío). Las automatizaciones son ${ratio.toFixed(1)}x más eficientes por envío.`}
        />
        <InsightCard
          type="info"
          title="Remarketing: Joya Oculta"
          description={`Los workflows de remarketing de producto y categoría muestran CTR excepcionales (>5%). Son los workflows con mejor ratio clicks→compra, indicando alta intención de compra. Prioriza su mantenimiento y optimización.`}
        />
      </div>
    </motion.div>
  );
}
