import ModeHeader from "../ModeHeader";
import EmailScaleCard from "../cards/EmailScaleCard";
import PushPerformanceCard from "../cards/PushPerformanceCard";
import CartWinnerCard from "../cards/CartWinnerCard";
import ReactivationCard from "../cards/ReactivationCard";
import ListFatigueCard from "../cards/ListFatigueCard";

export default function OperadorMode() {
  return (
    <div className="space-y-4">
      <ModeHeader
        title="Operador"
        cadence="Semanal · 20 minutos"
        question="¿Qué detengo, escalo o investigo?"
        blurb="Cada tarjeta produce una lista corta de acciones concretas. Ejecutas fuera del sistema; la semana siguiente la misma tarjeta muestra el efecto."
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmailScaleCard delay={0.05} />
        <PushPerformanceCard delay={0.1} />
        <CartWinnerCard delay={0.15} />
        <ReactivationCard delay={0.2} />
        <ListFatigueCard delay={0.25} />
      </div>
    </div>
  );
}
