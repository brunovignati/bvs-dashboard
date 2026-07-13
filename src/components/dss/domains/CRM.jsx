import DomainHeader from "../DomainHeader";
import BaseHealthCard from "../cards/BaseHealthCard";
import ListPressureCard from "../cards/ListPressureCard";
import SegmentsCard from "../cards/SegmentsCard";

export default function CRM({ index, total }) {
  return (
    <div className="space-y-5">
      <DomainHeader title="CRM" objetivo="Dirigir el marketing a la audiencia correcta y mantener la base de contactos sana." index={index} total={total} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="lg:col-span-2"><BaseHealthCard delay={0.03} /></div>
        <ListPressureCard delay={0.05} />
        <SegmentsCard delay={0.07} />
      </div>
    </div>
  );
}
