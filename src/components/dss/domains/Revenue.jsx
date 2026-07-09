import DomainHeader from "../DomainHeader";
import RevenueEvolutionCard from "../cards/RevenueEvolutionCard";
import MixChannelCard from "../cards/MixChannelCard";
import OmnichannelCard from "../cards/OmnichannelCard";
import BlockPlaceholder from "../BlockPlaceholder";

export default function Revenue() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Revenue" objetivo="Entender y hacer crecer los ingresos, y saber de dónde viene cada euro." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueEvolutionCard delay={0.05} />
        <MixChannelCard delay={0.1} />
        <OmnichannelCard delay={0.15} />
        <BlockPlaceholder
          question="RV-3 · ¿Voy camino de cumplir el objetivo?"
          viz="Bullet chart (acumulado vs. meta) + línea con banda de confianza."
          maturity="green"
          note="Requiere definir el objetivo del periodo (input manual): pendiente de configurar la meta."
        />
      </div>
    </div>
  );
}
