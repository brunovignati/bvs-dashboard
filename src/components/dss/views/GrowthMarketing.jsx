/**
 * Growth — vista de crecimiento: Revenue (composición: mix, palanca, no atribuido,
 * marca propia, canal de venta y temática), Clientes y Automatizaciones. Marketing
 * es ahora una vista propia. El tramo de Revenue excluye objetivo/evolución (viven en
 * Estado del negocio) para no duplicar tarjetas.
 */
import DomainHeader from "../DomainHeader";
import SectionNav from "../SectionNav";
import MixChannelCard from "../cards/MixChannelCard";
import RevenueBridgeCard from "../cards/RevenueBridgeCard";
import UnattributedRevenueCard from "../cards/UnattributedRevenueCard";
import OwnBrandCard from "../cards/OwnBrandCard";
import OmnichannelCard from "../cards/OmnichannelCard";
import ProductThemeCard from "../cards/ProductThemeCard";
import Clientes from "../domains/Clientes";
import Automatizaciones from "../domains/Automatizaciones";

export default function GrowthMarketing() {
  return (
    <div className="space-y-8">
      <SectionNav sections={[
        { id: "sec-revenue", label: "Revenue" },
        { id: "sec-clientes", label: "Clientes" },
        { id: "sec-auto", label: "Automatizaciones" },
      ]} />
      <section id="sec-revenue" className="scroll-mt-28 space-y-5">
        <DomainHeader title="Revenue" objetivo="De dónde viene cada euro: qué lo mueve, por qué canal se atribuye, por qué canal se vende y qué temática pesa." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <MixChannelCard delay={0.03} />
          <RevenueBridgeCard delay={0.05} />
          <UnattributedRevenueCard delay={0.07} />
          <OwnBrandCard delay={0.09} />
          <OmnichannelCard delay={0.11} />
          <ProductThemeCard delay={0.13} />
        </div>
      </section>
      <div id="sec-clientes" className="scroll-mt-28"><Clientes /></div>
      <div id="sec-auto" className="scroll-mt-28"><Automatizaciones /></div>
    </div>
  );
}
