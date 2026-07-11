import { usePulso } from "@/lib/dss/usePulso";
import RevenueDailyCard from "../cards/RevenueDailyCard";
import ChannelDropCard from "../cards/ChannelDropCard";
import CriticalWorkflowCard from "../cards/CriticalWorkflowCard";

// Solo las anomalías de los últimos días. El título de sección y el resumen de revenue
// por línea los pone la vista (DailyHealth). La recurrencia se movió a Clientes.
export default function SaludDelNegocio() {
  const { revenue, channelData, wf } = usePulso();
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RevenueDailyCard {...revenue} delay={0.05} />
      <ChannelDropCard {...channelData} delay={0.1} />
      <CriticalWorkflowCard {...wf} delay={0.15} />
    </div>
  );
}
