import DomainHeader from "../DomainHeader";
import RevenueChart from "@/components/dashboard/RevenueChart";
import AttributionAnalysis from "@/components/dashboard/AttributionAnalysis";
import ChannelSegmentation from "@/components/dashboard/ChannelSegmentation";
import CorrelationMatrix from "@/components/dashboard/CorrelationMatrix";
import BlockPlaceholder from "../BlockPlaceholder";

export default function Revenue() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Revenue" objetivo="Entender y hacer crecer los ingresos, y saber de dónde viene cada euro." />
      <RevenueChart />
      <AttributionAnalysis />
      <ChannelSegmentation />
      <CorrelationMatrix />
      <BlockPlaceholder
        question="RV-3 · ¿Voy camino de cumplir el objetivo?"
        viz="Bullet chart (acumulado vs. meta) + proyección con banda."
        maturity="green"
        note="Requiere definir el objetivo del periodo (input manual): pendiente de configurar la meta."
      />
    </div>
  );
}
