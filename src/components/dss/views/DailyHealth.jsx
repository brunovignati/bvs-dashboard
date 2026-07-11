/**
 * DailyHealth — "café de la mañana": estado del negocio + desviaciones recientes
 * + progreso a objetivo y evolución del revenue. Reúne Salud del Negocio y las dos
 * tarjetas de cabecera de Revenue (objetivo + evolución). El resto de Revenue vive
 * en Growth & Marketing (cada tarjeta en un único sitio, sin duplicar).
 */
import DomainHeader from "../DomainHeader";
import SaludDelNegocio from "../domains/SaludDelNegocio";
import RevenueTargetCard from "../cards/RevenueTargetCard";
import RevenueEvolutionCard from "../cards/RevenueEvolutionCard";

export default function DailyHealth() {
  return (
    <div className="space-y-8">
      {/* Jerarquía: lo primero es si vamos a objetivo, luego cómo evoluciona el revenue,
          y por último el estado/desviaciones recientes. */}
      <section className="space-y-6">
        <DomainHeader title="Objetivo y evolución de revenue" objetivo="¿Voy camino del objetivo y cómo evoluciona el revenue?" />
        <RevenueTargetCard delay={0.03} />
        <RevenueEvolutionCard delay={0.05} />
      </section>
      <section className="space-y-6">
        <DomainHeader title="Salud del negocio" objetivo="Estado de un vistazo y desviaciones de los últimos días." />
        <SaludDelNegocio />
      </section>
    </div>
  );
}
