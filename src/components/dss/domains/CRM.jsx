import DomainHeader from "../DomainHeader";
import BaseHealthCard from "../cards/BaseHealthCard";
import SegmentsCard from "../cards/SegmentsCard";

export default function CRM() {
  return (
    <div className="space-y-6">
      <DomainHeader title="CRM" objetivo="Dirigir el marketing a la audiencia correcta y mantener la base de contactos sana." />
      <BaseHealthCard delay={0.03} />
      <SegmentsCard delay={0.05} />
    </div>
  );
}
