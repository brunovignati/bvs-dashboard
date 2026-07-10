import DomainHeader from "../DomainHeader";
import EmailPerformance from "@/components/dashboard/EmailPerformance";
import PushAnalysis from "@/components/dashboard/PushAnalysis";
import StickyWebContent from "@/components/dashboard/StickyWebContent";
import DayOfWeekAnalysis from "@/components/dashboard/DayOfWeekAnalysis";
import AttributionAnalysis from "@/components/dashboard/AttributionAnalysis";
import ListFatigueCard from "../cards/ListFatigueCard";
import MarketingFunnelCard from "../cards/MarketingFunnelCard";
import Ga4TrafficCard from "../cards/Ga4TrafficCard";
import SocialReachCard from "../cards/SocialReachCard";
import SocialContentCard from "../cards/SocialContentCard";

export default function Marketing() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Marketing" objetivo="Que cada canal y campaña rinda al máximo sin dañar el activo (la lista)." />
      <MarketingFunnelCard delay={0.03} />
      <AttributionAnalysis />
      <EmailPerformance />
      <PushAnalysis />
      <StickyWebContent />
      <DayOfWeekAnalysis />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListFatigueCard delay={0.05} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Tráfico web y redes</p>
      <Ga4TrafficCard delay={0.05} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SocialReachCard delay={0.05} />
        <SocialContentCard delay={0.1} />
      </div>
    </div>
  );
}
