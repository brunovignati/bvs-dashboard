import DomainHeader from "../DomainHeader";
import EmailDeliverabilityCard from "../cards/EmailDeliverabilityCard";
import SendVolumeCard from "../cards/SendVolumeCard";

// Cascada causa→efecto: primero la CARGA de la máquina de envío (¿hay picos?),
// después su CONSECUENCIA sobre el activo (¿se mantiene la apertura/entregabilidad?).
export default function Operaciones() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Salud de envío" objetivo="Que la maquinaria de envío de email funcione sin roturas (volumen y entregabilidad)." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SendVolumeCard delay={0.05} />
        <EmailDeliverabilityCard delay={0.1} />
      </div>
    </div>
  );
}
