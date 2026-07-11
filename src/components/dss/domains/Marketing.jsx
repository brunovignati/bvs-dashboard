import DomainHeader from "../DomainHeader";
import MarketingFunnelCard from "../cards/MarketingFunnelCard";
import EmailScaleCard from "../cards/EmailScaleCard";
import PushPerformanceCard from "../cards/PushPerformanceCard";
import PushChannelTrendCard from "../cards/PushChannelTrendCard";
import WebStickyCard from "../cards/WebStickyCard";
import WebContentTrendCard from "../cards/WebContentTrendCard";
import BestDayCard from "../cards/BestDayCard";
import ListFatigueCard from "../cards/ListFatigueCard";
import Ga4TrafficCard from "../cards/Ga4TrafficCard";
import SocialReachCard from "../cards/SocialReachCard";
import SocialAudienceCard from "../cards/SocialAudienceCard";
import SocialContentCard from "../cards/SocialContentCard";

const Sub = ({ children }) => (
  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-3">{children}</p>
);

// Cascada cognitiva: síntesis (¿funciona?) → canales que generan venta → captación
// en la web → notoriedad y tráfico (contexto de embudo) → optimización de envíos.
export default function Marketing() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Marketing" objetivo="Que cada canal y campaña rinda al máximo sin dañar el activo (la lista)." />

      {/* 1 · Síntesis */}
      <MarketingFunnelCard delay={0.03} />

      {/* 2 · Canales que generan venta */}
      <Sub>Canales que generan venta</Sub>
      <EmailScaleCard delay={0.05} />
      <PushPerformanceCard delay={0.07} />
      <PushChannelTrendCard delay={0.09} />

      {/* 3 · Captación en la web */}
      <Sub>Captación en la web</Sub>
      <WebStickyCard delay={0.11} />
      <WebContentTrendCard delay={0.13} />

      {/* 4 · Notoriedad y tráfico (parte alta del embudo) */}
      <Sub>Notoriedad y tráfico</Sub>
      <Ga4TrafficCard delay={0.15} />
      <SocialReachCard delay={0.17} />
      <SocialAudienceCard delay={0.19} />
      <SocialContentCard delay={0.21} />

      {/* 5 · Optimización y salud de los envíos */}
      <Sub>Optimización de envíos</Sub>
      <BestDayCard delay={0.23} />
      <ListFatigueCard delay={0.25} />
    </div>
  );
}
