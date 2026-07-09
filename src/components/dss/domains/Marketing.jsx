import DomainHeader from "../DomainHeader";
import EmailScaleCard from "../cards/EmailScaleCard";
import PushPerformanceCard from "../cards/PushPerformanceCard";
import ListFatigueCard from "../cards/ListFatigueCard";
import WebStickyCard from "../cards/WebStickyCard";
import BestDayCard from "../cards/BestDayCard";
import BlockPlaceholder from "../BlockPlaceholder";

export default function Marketing() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Marketing" objetivo="Que cada canal y campaña rinda al máximo sin dañar el activo (la lista)." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmailScaleCard delay={0.05} />
        <PushPerformanceCard delay={0.1} />
        <ListFatigueCard delay={0.15} />
        <WebStickyCard delay={0.2} />
        <BestDayCard delay={0.25} />
        <BlockPlaceholder
          question="MK-6 · ¿De dónde llega el tráfico y cómo se comporta?"
          viz="Barras por fuente + embudo (GA4)."
          maturity="amber"
          note="Fuente: GA4 · ga4_daily. Se activa cuando la tabla acumule histórico."
        />
        <BlockPlaceholder
          question="MK-7 · ¿Generan notoriedad y alcance las redes?"
          viz="Líneas de evolución por red (Metricool)."
          maturity="amber"
          note="Fuente: Metricool · ig_daily / fb_daily / tk_daily. Se activa cuando acumulen histórico."
        />
      </div>
    </div>
  );
}
