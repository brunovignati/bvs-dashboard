import DomainHeader from "../DomainHeader";
import EmailPerformance from "@/components/dashboard/EmailPerformance";
import PushAnalysis from "@/components/dashboard/PushAnalysis";
import StickyWebContent from "@/components/dashboard/StickyWebContent";
import DayOfWeekAnalysis from "@/components/dashboard/DayOfWeekAnalysis";
import ListFatigueCard from "../cards/ListFatigueCard";
import Ga4TrafficCard from "../cards/Ga4TrafficCard";
import SocialReachCard from "../cards/SocialReachCard";

export default function Marketing() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Marketing" objetivo="Que cada canal y campaña rinda al máximo sin dañar el activo (la lista)." />
      <EmailPerformance />
      <PushAnalysis />
      <StickyWebContent />
      <DayOfWeekAnalysis />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListFatigueCard delay={0.05} />
        <Ga4TrafficCard delay={0.1} />
        <SocialReachCard delay={0.15} />
      </div>
    </div>
  );
}
