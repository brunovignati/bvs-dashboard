import DomainHeader from "../DomainHeader";
import CartWinnerCard from "../cards/CartWinnerCard";
import ReactivationCard from "../cards/ReactivationCard";

export default function Automatizaciones() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Automatizaciones" objetivo="Que los flujos automáticos generen revenue recurrente y no se degraden." />
      <CartWinnerCard delay={0.03} />
      <ReactivationCard delay={0.05} />
    </div>
  );
}
