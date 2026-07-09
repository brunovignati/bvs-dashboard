import DomainHeader from "../DomainHeader";
import { usePulso } from "@/lib/dss/usePulso";
import EmailDeliverabilityCard from "../cards/EmailDeliverabilityCard";
import CriticalWorkflowCard from "../cards/CriticalWorkflowCard";
import SendVolumeCard from "../cards/SendVolumeCard";

export default function Operaciones() {
  const { email, wf } = usePulso();
  return (
    <div className="space-y-4">
      <DomainHeader title="Operaciones" objetivo="Que la maquinaria de envío funcione sin roturas (entregabilidad y volumen)." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EmailDeliverabilityCard {...email} delay={0.05} />
        <SendVolumeCard delay={0.1} />
        <CriticalWorkflowCard {...wf} delay={0.15} />
      </div>
    </div>
  );
}
