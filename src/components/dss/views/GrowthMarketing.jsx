/**
 * GrowthMarketing — vista de análisis: Revenue (mix, evolución, no atribuido),
 * Clientes, Marketing y Automatizaciones. Reutiliza los dominios existentes como
 * sub-secciones; el tramo de Revenue de aquí excluye objetivo/evolución (viven en
 * Daily Health) para no duplicar tarjetas.
 */
import DomainHeader from "../DomainHeader";
import MixChannelCard from "../cards/MixChannelCard";
import RevenueBridgeCard from "../cards/RevenueBridgeCard";
import UnattributedRevenueCard from "../cards/UnattributedRevenueCard";
import OwnBrandCard from "../cards/OwnBrandCard";
import Clientes from "../domains/Clientes";
import Marketing from "../domains/Marketing";
import Automatizaciones from "../domains/Automatizaciones";

export default function GrowthMarketing() {
  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <DomainHeader title="Revenue" objetivo="De dónde viene cada euro y qué lo mueve." />
        <MixChannelCard delay={0.03} />
        <RevenueBridgeCard delay={0.05} />
        <UnattributedRevenueCard delay={0.07} />
        <OwnBrandCard delay={0.09} />
      </section>
      <Clientes />
      <Marketing />
      <Automatizaciones />
    </div>
  );
}
