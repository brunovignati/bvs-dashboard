import SectionNav from "../SectionNav";
import ViewHeader from "../ViewHeader";
import { useComparison } from "@/lib/ComparisonContext";
import MarketingFunnelCard from "../cards/MarketingFunnelCard";
import EmailScaleCard from "../cards/EmailScaleCard";
import PushPerformanceCard from "../cards/PushPerformanceCard";
import PushChannelTrendCard from "../cards/PushChannelTrendCard";
import WebStickyCard from "../cards/WebStickyCard";
import WebContentTrendCard from "../cards/WebContentTrendCard";
import BestDayCard from "../cards/BestDayCard";
import Ga4TrafficCard from "../cards/Ga4TrafficCard";
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
  const { rangeB, rangeA, labelRange } = useComparison();
  const meta = `Datos a ${labelRange(rangeB)} · comparado con ${labelRange(rangeA)}`;
  return (
    <div className="space-y-6">
      <ViewHeader view="Marketing" section="Canales y campañas" meta={meta} />
      <SectionNav sections={[
        { id: "mk-canales", label: "Canales de venta" },
        { id: "mk-web", label: "Captación web" },
        { id: "mk-notoriedad", label: "Notoriedad y tráfico" },
        { id: "mk-envios", label: "Optimización de envíos" },
      ]} />

      {/* 1 · Síntesis */}
      <MarketingFunnelCard delay={0.03} />

      {/* 2 · Canales que generan venta */}
      <Sub id="mk-canales">Canales que generan venta</Sub>
      <Grid>
        <EmailScaleCard delay={0.05} />
        <PushChannelTrendCard delay={0.07} />
        <div className="lg:col-span-2"><PushPerformanceCard delay={0.09} /></div>
      </Grid>

      {/* 3 · Captación en la web */}
      <Sub id="mk-web">Captación en la web</Sub>
      <Grid>
        <WebStickyCard delay={0.11} />
        <WebContentTrendCard delay={0.13} />
      </Grid>

      {/* 4 · Notoriedad y tráfico (parte alta del embudo) */}
      <Sub id="mk-notoriedad">Notoriedad y tráfico</Sub>
      <p className="text-xs text-muted-foreground -mt-2">Métricas de alcance y audiencia: parte alta del embudo. Miden notoriedad, no ingresos directos.</p>
      <Grid>
        <Ga4TrafficCard delay={0.15} />
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
