/**
 * DailyHealth — "café de la mañana": banda-resumen + rumbo del mes + alertas.
 */
import DomainHeader from "../DomainHeader";
import ViewHeader from "../ViewHeader";
import { useComparison } from "@/lib/ComparisonContext";
import SaludDelNegocio from "../domains/SaludDelNegocio";
import SaludResumen from "../domains/SaludResumen";
import RevenueTargetCard from "../cards/RevenueTargetCard";
import RevenueEvolutionCard from "../cards/RevenueEvolutionCard";

export default function DailyHealth() {
  const { rangeB, rangeA, labelRange } = useComparison();
  const meta = `Datos a ${labelRange(rangeB)} · comparado con ${labelRange(rangeA)}`;

  return (
    <div className="space-y-6">
      <ViewHeader view="Estado del negocio" section="Rumbo del mes" meta={meta} />

      <section className="space-y-6 pt-2">
        <DomainHeader title="Rumbo del mes" objetivo="¿Voy camino del objetivo del mes, cómo evoluciona el revenue y de qué línea viene? (acumulado mensual)" index={1} total={2} />
        <RevenueTargetCard delay={0.03} />
        <RevenueEvolutionCard delay={0.05} />
        <SaludResumen />
      </section>
      <section className="space-y-6">
        <DomainHeader title="Alertas de los últimos días" objetivo="¿Qué se ha desviado de lo normal en los últimos días? (seguimiento diario)" index={2} total={2} />
        <SaludDelNegocio />
      </section>
    </div>
  );
}
