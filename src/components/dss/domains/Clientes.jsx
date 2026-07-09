import DomainHeader from "../DomainHeader";
import AcquisitionRetentionCard from "../cards/AcquisitionRetentionCard";
import BlockPlaceholder from "../BlockPlaceholder";

export default function Clientes() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Clientes" objetivo="La economía del comprador: si el negocio crece captando o fidelizando." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AcquisitionRetentionCard delay={0.05} />
        <BlockPlaceholder
          question="CL-2 · ¿Cuánto valor aporta un cliente?"
          viz="KPI + barras comparativas (revenue por comprador)."
          maturity="amber"
          note="Proxy con datos agregados. El CLV individual exige Contact ID (no disponible)."
        />
      </div>
    </div>
  );
}
