import DomainHeader from "../DomainHeader";
import AcquisitionRetentionCard from "../cards/AcquisitionRetentionCard";
import CustomerValueCard from "../cards/CustomerValueCard";
import CohortHeatmapCard from "../cards/CohortHeatmapCard";

// CohortHeatmapCard: LTV real por cohorte. Datos poblados desde PrestaShop (Gestor SQL →
// cohort_retention en Supabase). Ver CLAUDE.md §16.
export default function Clientes({ index, total }) {
  return (
    <div className="space-y-5">
      <DomainHeader title="Clientes" objetivo="La economía del comprador: si el negocio crece captando o fidelizando." index={index} total={total} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="lg:col-span-2"><AcquisitionRetentionCard delay={0.03} /></div>
        <div className="lg:col-span-2"><CohortHeatmapCard delay={0.05} /></div>
        <div className="lg:col-span-2"><CustomerValueCard delay={0.07} /></div>
      </div>
    </div>
  );
}
