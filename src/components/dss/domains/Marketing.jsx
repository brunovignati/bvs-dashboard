import DomainHeader from "../DomainHeader";
import MarketingFunnelCard from "../cards/MarketingFunnelCard";
import EmailScaleCard from "../cards/EmailScaleCard";
import PushPerformanceCard from "../cards/PushPerformanceCard";
import PushChannelTrendCard from "../cards/PushChannelTrendCard";
import WebStickyCard from "../cards/WebStickyCard";
import BestDayCard from "../cards/BestDayCard";
import ListFatigueCard from "../cards/ListFatigueCard";
import Ga4TrafficCard from "../cards/Ga4TrafficCard";
import SocialReachCard from "../cards/SocialReachCard";
import SocialAudienceCard from "../cards/SocialAudienceCard";
import SocialContentCard from "../cards/SocialContentCard";

export default function Marketing() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Marketing" objetivo="Que cada canal y campaña rinda al máximo sin dañar el activo (la lista)." />
      <MarketingFunnelCard delay={0.03} />
      <EmailScaleCard delay={0.05} />
      <PushPerformanceCard delay={0.07} />
      <PushChannelTrendCard delay={0.08} />
      <WebStickyCard delay={0.09} />
      <BestDayCard delay={0.11} />
      <ListFatigueCard delay={0.13} />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Tráfico web y redes</p>
      <Ga4TrafficCard delay={0.15} />
      <SocialReachCard delay={0.17} />
      <SocialAudienceCard delay={0.19} />
      <SocialContentCard delay={0.21} />
    </div>
  );
}
