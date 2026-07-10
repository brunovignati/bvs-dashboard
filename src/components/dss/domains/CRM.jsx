import DomainHeader from "../DomainHeader";
import BaseHealthCard from "../cards/BaseHealthCard";
import ListPressureCard from "../cards/ListPressureCard";
import SegmentsCard from "../cards/SegmentsCard";

export default function CRM() {
  return (
    <div className="space-y-6">
      <DomainHeader title="CRM" objetivo="Dirigir el marketing a la audiencia correcta y mantener la base de contactos sana." />
      <BaseHealthCard delay={0.03} />
      <ListPressureCard delay={0.05} />
      <SegmentsCard delay={0.07} />
    </div>
  );
}
