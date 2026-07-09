import DomainHeader from "../DomainHeader";
import BaseHealthCard from "../cards/BaseHealthCard";
import SegmentsCard from "../cards/SegmentsCard";
import BlockPlaceholder from "../BlockPlaceholder";

export default function CRM() {
  return (
    <div className="space-y-4">
      <DomainHeader title="CRM" objetivo="Dirigir el marketing a la audiencia correcta y mantener la base de contactos sana." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SegmentsCard delay={0.05} />
        <BaseHealthCard delay={0.1} />
        <BlockPlaceholder
          question="CR-3 · ¿Qué segmentos priorizar en la próxima campaña?"
          viz="Matriz/scatter tamaño vs. valor (cuadrantes de priorización)."
          maturity="amber"
          note="Fuente: segments."
        />
      </div>
    </div>
  );
}
