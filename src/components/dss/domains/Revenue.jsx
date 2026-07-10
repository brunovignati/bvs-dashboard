import DomainHeader from "../DomainHeader";
import RevenueTargetCard from "../cards/RevenueTargetCard";
import RevenueEvolutionCard from "../cards/RevenueEvolutionCard";
import MixChannelCard from "../cards/MixChannelCard";
import RevenueBridgeCard from "../cards/RevenueBridgeCard";
import UnattributedRevenueCard from "../cards/UnattributedRevenueCard";

// Dominio de referencia de la estructura canónica: cada bloque es un EvidenceCard
// con la misma anatomía (pregunta → KPI → visualización → insight → acción → fuente).
export default function Revenue() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Revenue" objetivo="Entender y hacer crecer los ingresos, y saber de dónde viene cada euro." />
      <RevenueTargetCard delay={0.03} />
      <RevenueEvolutionCard delay={0.05} />
      <MixChannelCard delay={0.07} />
      <RevenueBridgeCard delay={0.09} />
      <UnattributedRevenueCard delay={0.11} />
    </div>
  );
}
