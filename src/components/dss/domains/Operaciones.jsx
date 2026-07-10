import DomainHeader from "../DomainHeader";
import EmailDeliverabilityCard from "../cards/EmailDeliverabilityCard";
import SendVolumeCard from "../cards/SendVolumeCard";

export default function Operaciones() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Operaciones" objetivo="Que la maquinaria de envío funcione sin roturas (entregabilidad y volumen)." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmailDeliverabilityCard delay={0.05} />
        <SendVolumeCard delay={0.1} />
      </div>
    </div>
  );
}
