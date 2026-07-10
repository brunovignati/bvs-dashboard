import DomainHeader from "../DomainHeader";
import AcquisitionRetentionCard from "../cards/AcquisitionRetentionCard";
import CohortHeatmapCard from "../cards/CohortHeatmapCard";
import CustomerValueCard from "../cards/CustomerValueCard";
import OmnichannelCard from "../cards/OmnichannelCard";

export default function Clientes() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Clientes" objetivo="La economía del comprador: si el negocio crece captando o fidelizando." />
      <AcquisitionRetentionCard delay={0.03} />
      <CohortHeatmapCard delay={0.05} />
      <CustomerValueCard delay={0.07} />
      <OmnichannelCard delay={0.09} />
    </div>
  );
}
