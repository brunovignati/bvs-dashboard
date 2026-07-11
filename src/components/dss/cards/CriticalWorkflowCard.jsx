import EvidenceCard from "../EvidenceCard";
import { fmtNumber } from "@/lib/dashboardData";

export default function CriticalWorkflowCard({ workflows, anyStalled, hasData, delay }) {
  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Un workflow crítico dejó de enviar o convertir?"
        answer="Sin datos diarios de workflow"
        answerTone="neutral"
        context="No hay suficiente actividad diaria de push/email por workflow todavía."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma el sync diario de daily_push / daily_email por workflow." }]}
        delay={delay}
      />
    );
  }
  const answer = anyStalled ? "Un workflow crítico está parado" : "Workflows críticos activos";
  const context = anyStalled
    ? "Un flujo que normalmente envía a diario no ha enviado en los últimos 3 días."
    : "Los flujos de carrito y reactivación siguen enviando con normalidad.";

  return (
    <EvidenceCard
      question="¿Un workflow crítico dejó de enviar o convertir?"
      answer={answer}
      answerTone={anyStalled ? "bad" : "good"}
      context={context}
      maturity="amber"
      severity={anyStalled ? "high" : undefined}
      actions={anyStalled
        ? [{ verb: "investigar", rationale: "Un workflow parado suele indicar un error de configuración o de trigger en Connectif. Revísalo hoy." }]
        : [{ verb: "mantener", rationale: "Automatizaciones críticas operativas." }]}
      delay={delay}
      note="Crítico = workflows de carrito y reactivación/reabastecimiento (D15/D08). Regla de 'parado': tiene historial de ≥8 días con envíos y 0 envíos en los últimos 3 días. Madura con el histórico diario."
    >
      <p className="text-[10px] text-muted-foreground/70 mb-1.5">Regla: <span className="font-semibold text-foreground">parado</span> = ≥8 días de envío en su historial y sin ningún envío en los últimos 3 días.</p>
      <div className="space-y-1.5 mt-1">
        {workflows.slice(0, 5).map((w, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs">
            <span className="truncate text-foreground max-w-[65%]" title={w.name}>{w.name}</span>
            <span className={`font-mono ${w.stalled ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
              {w.stalled ? "parado" : `${fmtNumber(w.recentSent)} env. 7d`}
            </span>
          </div>
        ))}
        {workflows.length === 0 && <p className="text-xs text-muted-foreground">Sin workflows críticos detectados por nombre.</p>}
      </div>
    </EvidenceCard>
  );
}
