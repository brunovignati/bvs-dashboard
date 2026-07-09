import { usePulso } from "@/lib/dss/usePulso";
import AlertRibbon from "../AlertRibbon";
import RevenueDailyCard from "../cards/RevenueDailyCard";
import EmailDeliverabilityCard from "../cards/EmailDeliverabilityCard";
import ChannelDropCard from "../cards/ChannelDropCard";
import CriticalWorkflowCard from "../cards/CriticalWorkflowCard";
import ModeHeader from "../ModeHeader";

export default function PulsoMode() {
  const { signals, revenue, email, channelData, wf } = usePulso();

  return (
    <div className="space-y-4">
      <ModeHeader
        title="Pulso"
        cadence="Diario · 2 minutos"
        question="¿Algo se rompió hoy?"
        blurb="Si no hay señales críticas, puedes cerrar tranquilo. Si las hay, ya estás en el punto de entrada correcto."
      />
      <AlertRibbon signals={signals} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueDailyCard {...revenue} delay={0.05} />
        <EmailDeliverabilityCard {...email} delay={0.1} />
        <ChannelDropCard {...channelData} delay={0.15} />
        <CriticalWorkflowCard {...wf} delay={0.2} />
      </div>
    </div>
  );
}
