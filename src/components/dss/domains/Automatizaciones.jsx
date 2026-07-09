import DomainHeader from "../DomainHeader";
import CartWinnerCard from "../cards/CartWinnerCard";
import ReactivationCard from "../cards/ReactivationCard";
import BlockPlaceholder from "../BlockPlaceholder";

export default function Automatizaciones() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Automatizaciones" objetivo="Que los flujos automáticos generen revenue recurrente y no se degraden." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CartWinnerCard delay={0.05} />
        <ReactivationCard delay={0.1} />
        <BlockPlaceholder
          question="AU-3 · ¿Alguna automatización está degradada o parada?"
          viz="Sparklines por workflow con marca de alerta."
          maturity="amber"
          note="Fuente: daily_push / daily_email. Se solapa con la señal de anomalías de Salud del Negocio."
        />
      </div>
    </div>
  );
}
