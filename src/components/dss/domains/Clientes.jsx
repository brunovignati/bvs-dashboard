import DomainHeader from "../DomainHeader";
import AcquisitionRetentionCard from "../cards/AcquisitionRetentionCard";
import CustomerValueCard from "../cards/CustomerValueCard";
import OmnichannelCard from "../cards/OmnichannelCard";

// CohortHeatmapCard queda oculta: requiere el informe de cohortes en Connectif, hoy
// bloqueado por el límite del plan (Data Explorer 20/20). El pipeline sigue en el repo
// (sql/create_cohort_retention.sql + t_cohort_retention + useCohortRetention) para
// reactivarla cuando se libere un slot. Ver CLAUDE.md §16.
export default function Clientes() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Clientes" objetivo="La economía del comprador: si el negocio crece captando o fidelizando." />
      <AcquisitionRetentionCard delay={0.03} />
      <CustomerValueCard delay={0.05} />
      <OmnichannelCard delay={0.07} />
    </div>
  );
}
