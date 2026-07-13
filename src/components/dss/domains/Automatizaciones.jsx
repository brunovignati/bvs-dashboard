import DomainHeader from "../DomainHeader";
import CartWinnerCard from "../cards/CartWinnerCard";
import CartSequenceCard from "../cards/CartSequenceCard";
import ReactivationCard from "../cards/ReactivationCard";

export default function Automatizaciones({ index, total }) {
  return (
    <div className="space-y-5">
      <DomainHeader title="Automatizaciones" objetivo="Que los flujos automáticos generen revenue recurrente y no se degraden." index={index} total={total} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <CartWinnerCard delay={0.03} />
        <ReactivationCard delay={0.05} />
        <div className="lg:col-span-2"><CartSequenceCard delay={0.07} /></div>
      </div>
    </div>
  );
}
