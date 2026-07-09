import DomainHeader from "../DomainHeader";
import RevenueChart from "@/components/dashboard/RevenueChart";
import AttributionAnalysis from "@/components/dashboard/AttributionAnalysis";
import ChannelSegmentation from "@/components/dashboard/ChannelSegmentation";
import CorrelationMatrix from "@/components/dashboard/CorrelationMatrix";
import RevenueTargetCard from "../cards/RevenueTargetCard";
import UnattributedRevenueCard from "../cards/UnattributedRevenueCard";

export default function Revenue() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Revenue" objetivo="Entender y hacer crecer los ingresos, y saber de dónde viene cada euro." />
      <RevenueTargetCard delay={0.03} />
      <RevenueChart />
      <AttributionAnalysis />
      <UnattributedRevenueCard delay={0.06} />
      <ChannelSegmentation />
      <CorrelationMatrix />
    </div>
  );
}
