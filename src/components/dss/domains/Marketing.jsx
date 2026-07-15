import SectionNav from "../SectionNav";
import MarketingFunnelCard from "../cards/MarketingFunnelCard";
import WebFunnelCard from "../cards/WebFunnelCard";
import MarketingFunnelOverviewCard from "../cards/MarketingFunnelOverviewCard";
import EmailScaleCard from "../cards/EmailScaleCard";
import PushPerformanceCard from "../cards/PushPerformanceCard";
import PushChannelTrendCard from "../cards/PushChannelTrendCard";
import WebStickyCard from "../cards/WebStickyCard";
import WebContentTrendCard from "../cards/WebContentTrendCard";
import WebConversionCard from "../cards/WebConversionCard";
import BestDayCard from "../cards/BestDayCard";
import Ga4TrafficCard from "../cards/Ga4TrafficCard";
import Ga4ChannelFunnelCard from "../cards/Ga4ChannelFunnelCard";
import Ga4DeviceCard from "../cards/Ga4DeviceCard";
import SocialReachCard from "../cards/SocialReachCard";
import SocialAudienceCard from "../cards/SocialAudienceCard";
import SocialContentCard from "../cards/SocialContentCard";

const Sub = ({ children, id }) => (
  <p id={id} className="scroll-mt-28 text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">{children}</p>
);
const Grid = ({ children }) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">{children}</div>
);

// Cascada cognitiva: síntesis (¿funciona?) → canales que generan venta → captación
// en la web → notoriedad y tráfico (contexto de embudo) → optimización de envíos.
// Layout bento: embudo/tabla a todo el ancho; el resto en 2 columnas.
export default function Marketing() {
  return (
    <div className="space-y-6">
      <SectionNav sections={[
        { id: "mk-embudo", label: "Embudo de marketing" },
        { id: "mk-canales", label: "Canales de venta" },
        { id: "mk-web", label: "Captación web" },
        { id: "mk-notoriedad", label: "Notoriedad y tráfico" },
        { id: "mk-envios", label: "Optimización de envíos" },
      ]} />

      {/* 0 · Embudo de marketing de punta a punta (notoriedad → venta), 4 fuentes */}
      <Sub id="mk-embudo">Embudo de marketing (punta a punta)</Sub>
      <p className="text-xs text-muted-foreground -mt-2">De la notoriedad social (Metricool) a las sesiones y el comportamiento (GA4) y la venta real (PrestaShop), en una sola cadena.</p>
      <MarketingFunnelOverviewCard delay={0.02} />

      {/* 1 · Síntesis: embudo del sitio (tráfico → compra) */}
      <WebFunnelCard delay={0.03} />

      {/* 2 · Canales que generan venta */}
      <Sub id="mk-canales">Canales que generan venta</Sub>
      <Grid>
        <div className="lg:col-span-2"><MarketingFunnelCard delay={0.04} /></div>
        <EmailScaleCard delay={0.05} />
        <PushChannelTrendCard delay={0.07} />
        <div className="lg:col-span-2"><PushPerformanceCard delay={0.09} /></div>
      </Grid>

      {/* 3 · Captación en la web */}
      <Sub id="mk-web">Captación en la web</Sub>
      <Grid>
        <WebStickyCard delay={0.11} />
        <WebContentTrendCard delay={0.13} />
        <div className="lg:col-span-2"><WebConversionCard delay={0.15} /></div>
      </Grid>

      {/* 4 · Notoriedad y tráfico (parte alta del embudo) */}
      <Sub id="mk-notoriedad">Notoriedad y tráfico</Sub>
      <p className="text-xs text-muted-foreground -mt-2">Métricas de alcance y audiencia: parte alta del embudo. Miden notoriedad, no ingresos directos.</p>
      <Grid>
        <div className="lg:col-span-2"><Ga4ChannelFunnelCard delay={0.14} /></div>
        <Ga4DeviceCard delay={0.15} />
        <Ga4TrafficCard delay={0.16} />
        <SocialReachCard delay={0.17} />
        <SocialAudienceCard delay={0.19} />
        <SocialContentCard delay={0.21} />
      </Grid>

      {/* 5 · Optimización de envíos. La salud/fatiga de la lista se consolida en
          Ops & CRM › CRM (ListPressureCard), a nivel de base, para no repetirla aquí. */}
      <Sub id="mk-envios">Optimización de envíos</Sub>
      <BestDayCard delay={0.23} />
    </div>
  );
}
