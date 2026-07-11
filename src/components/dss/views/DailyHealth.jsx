/**
 * DailyHealth — "café de la mañana": estado del negocio + desviaciones recientes
 * + progreso a objetivo y evolución del revenue. Reúne Salud del Negocio y las dos
 * tarjetas de cabecera de Revenue (objetivo + evolución). El resto de Revenue vive
 * en Growth & Marketing (cada tarjeta en un único sitio, sin duplicar).
 */
import DomainHeader from "../DomainHeader";
import SaludDelNegocio from "../domains/SaludDelNegocio";
import SaludResumen from "../domains/SaludResumen";
import RevenueTargetCard from "../cards/RevenueTargetCard";
import RevenueEvolutionCard from "../cards/RevenueEvolutionCard";

// Cascada: objetivo → evolución del revenue → su composición por línea → y por último
// las desviaciones recientes. Sin el header redundante "Salud del negocio".
export default function DailyHealth() {
  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <DomainHeader title="Objetivo y evolución de revenue" objetivo="¿Voy camino del objetivo, cómo evoluciona y de qué línea viene el revenue?" />
        <RevenueTargetCard delay={0.03} />
        <RevenueEvolutionCard delay={0.05} />
        <SaludResumen />
      </section>
      <section className="space-y-6">
        <DomainHeader title="Desviaciones recientes" objetivo="¿Qué se ha desviado de lo normal en los últimos días?" />
        <SaludDelNegocio />
      </section>
    </div>
  );
}
