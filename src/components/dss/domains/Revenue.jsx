import DomainHeader from "../DomainHeader";
import RevenueChart from "@/components/dashboard/RevenueChart";
import RevenueTargetCard from "../cards/RevenueTargetCard";
import RevenueBridgeCard from "../cards/RevenueBridgeCard";
import UnattributedRevenueCard from "../cards/UnattributedRevenueCard";

export default function Revenue() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Revenue" objetivo="Entender y hacer crecer los ingresos, y saber de dónde viene cada euro." />
      <RevenueTargetCard delay={0.03} />
      <RevenueChart />
      <RevenueBridgeCard delay={0.05} />
      <UnattributedRevenueCard delay={0.06} />
    </div>
  );
}
