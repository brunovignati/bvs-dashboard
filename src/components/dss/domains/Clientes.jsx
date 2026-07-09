import DomainHeader from "../DomainHeader";
import CohortAnalysis from "@/components/dashboard/CohortAnalysis";
import BlockPlaceholder from "../BlockPlaceholder";

export default function Clientes() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Clientes" objetivo="La economía del comprador: si el negocio crece captando o fidelizando." />
      <CohortAnalysis />
      <BlockPlaceholder
        question="CL-2 · ¿Cuánto valor aporta un cliente? (CLV)"
        viz="KPI + barras comparativas de revenue por comprador."
        maturity="red"
        note="El CLV y la retención real por cohorte exigen dato a nivel contacto (Contact ID), no disponible hoy."
      />
    </div>
  );
}
