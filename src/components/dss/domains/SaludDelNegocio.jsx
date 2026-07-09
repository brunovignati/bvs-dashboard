import DomainHeader from "../DomainHeader";
import { usePulso } from "@/lib/dss/usePulso";
import RevenueDailyCard from "../cards/RevenueDailyCard";
import EmailDeliverabilityCard from "../cards/EmailDeliverabilityCard";
import ChannelDropCard from "../cards/ChannelDropCard";
import CriticalWorkflowCard from "../cards/CriticalWorkflowCard";
import KpiGridCard from "../cards/KpiGridCard";

export default function SaludDelNegocio() {
  const { revenue, email, channelData, wf } = usePulso();
  return (
    <div className="space-y-4">
      <DomainHeader title="Salud del Negocio" objetivo="Estado del negocio de un vistazo y detección rápida de lo que se desvía." />
      <KpiGridCard delay={0.02} />
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">BN-2 · ¿Qué se ha desviado de lo normal?</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RevenueDailyCard {...revenue} delay={0.05} />
        <EmailDeliverabilityCard {...email} delay={0.1} />
        <ChannelDropCard {...channelData} delay={0.15} />
        <CriticalWorkflowCard {...wf} delay={0.2} />
      </div>
    </div>
  );
}
