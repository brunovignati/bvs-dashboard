import { usePulso } from "@/lib/dss/usePulso";
import SaludResumen from "./SaludResumen";
import RevenueDailyCard from "../cards/RevenueDailyCard";
import ChannelDropCard from "../cards/ChannelDropCard";
import CriticalWorkflowCard from "../cards/CriticalWorkflowCard";

export default function SaludDelNegocio() {
  const { revenue, channelData, wf } = usePulso();
  return (
    <div className="space-y-6">
      <SaludResumen />
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">¿Qué se ha desviado de lo normal? (últimos días)</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RevenueDailyCard {...revenue} delay={0.05} />
          <ChannelDropCard {...channelData} delay={0.1} />
          <CriticalWorkflowCard {...wf} delay={0.15} />
        </div>
      </div>
    </div>
  );
}
