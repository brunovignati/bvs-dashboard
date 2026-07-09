import DomainHeader from "../DomainHeader";
import EmailPerformance from "@/components/dashboard/EmailPerformance";
import PushAnalysis from "@/components/dashboard/PushAnalysis";
import StickyWebContent from "@/components/dashboard/StickyWebContent";
import DayOfWeekAnalysis from "@/components/dashboard/DayOfWeekAnalysis";
import ListFatigueCard from "../cards/ListFatigueCard";
import BlockPlaceholder from "../BlockPlaceholder";

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
          note="Fuente: Metricool · ig_daily / fb_daily / tk_daily."
        />
      </div>
    </div>
  );
}
