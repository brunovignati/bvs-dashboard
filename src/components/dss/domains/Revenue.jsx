import DomainHeader from "../DomainHeader";
import RevenueChart from "@/components/dashboard/RevenueChart";
import AttributionAnalysis from "@/components/dashboard/AttributionAnalysis";
import ChannelSegmentation from "@/components/dashboard/ChannelSegmentation";
import CorrelationMatrix from "@/components/dashboard/CorrelationMatrix";
import RevenueTargetCard from "../cards/RevenueTargetCard";

export default function Revenue() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Revenue" objetivo="Entender y hacer crecer los ingresos, y saber de dónde viene cada euro." />
      <RevenueTargetCard delay={0.03} />
      <RevenueChart />
      <AttributionAnalysis />
      <ChannelSegmentation />
      <CorrelationMatrix />
    </div>
  );
}
