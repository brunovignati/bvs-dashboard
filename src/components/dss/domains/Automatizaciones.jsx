import DomainHeader from "../DomainHeader";
import CartRecoveryFunnel from "@/components/dashboard/CartRecoveryFunnel";
import AuditComparison from "@/components/dashboard/AuditComparison";
import ReactivationCard from "../cards/ReactivationCard";

export default function Automatizaciones() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Automatizaciones" objetivo="Que los flujos automáticos generen revenue recurrente y no se degraden." />
      <CartRecoveryFunnel />
      <div className="grid grid-cols-1 gap-4">
        <ReactivationCard delay={0.05} />
      </div>
      <AuditComparison />
    </div>
  );
}
