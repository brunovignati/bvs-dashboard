/**
 * CohortHeatmapCard (Clientes) — LTV/retención real por cohorte.
 * Matriz mes-de-adquisición (fila) × mes-de-vida (columna); celda = retención
 * (compradores activos / tamaño de la cohorte). Es el estándar de industria para
 * el LTV y sustituye la lectura engañosa de "LTV como serie temporal".
 *
 * Puerta del dato: se enciende cuando el sync poble `cohort_retention` desde el
 * informe Data Explorer "V. Cohortes" (ver CLAUDE.md §16). Hasta entonces, gate.
 */
import EvidenceCard from "../EvidenceCard";
import { useCohortRetention } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MAX_LIFE = 12;
const MAX_COHORTS = 12;

export default function CohortHeatmapCard({ delay }) {
  const { data = [] } = useCohortRetention();
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Cómo retiene y cuánto vale cada cohorte? (LTV real)"
        answer="Se enciende con el informe de cohortes"
        answerTone="neutral"
        context="El heatmap de cohortes (mes de adquisición × mes de vida) es el LTV correcto y reemplaza la lectura por serie temporal. Necesita el informe de cohortes en el pipeline."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Crear el informe Data Explorer 'V. Cohortes' en Connectif; el sync poblará cohort_retention y este heatmap se activa solo (ver CLAUDE.md §16)." }]}
        delay={delay}
        note="Fuente prevista: Connectif · cohort_retention (mes de adquisición × mes de vida)."
      />
    );
  }

  // Agrupar por cohorte
  const cohorts = {};
  let maxLife = 0;
  for (const r of data) {
    const key = r.cohortYear * 12 + r.cohortMonth;
    (cohorts[key] ||= { key, year: r.cohortYear, month: r.cohortMonth, size: r.cohortSize || 0, cells: {} });
    cohorts[key].cells[r.lifeMonth] = r;
    if (r.cohortSize) cohorts[key].size = r.cohortSize;
    if (r.lifeMonth > maxLife) maxLife = r.lifeMonth;
  }
  const cols = Array.from({ length: Math.min(maxLife, MAX_LIFE) + 1 }, (_, i) => i);
  const rows = Object.values(cohorts).sort((a, b) => b.key - a.key).slice(0, MAX_COHORTS);

  const ret = (c, lm) => {
    const cell = c.cells[lm];
    if (!cell || !c.size) return null;
    return (cell.buyers / c.size) * 100;
  };
  // Media de retención por mes de vida (para el insight)
  const m1 = rows.map(c => ret(c, 1)).filter(v => v != null);
  const m3 = rows.map(c => ret(c, 3)).filter(v => v != null);
  const avg = (a) => a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  const r1 = avg(m1), r3 = avg(m3);

  const bg = (v) => v == null ? "transparent" : `hsl(16,79%,57%,${Math.max(0.06, Math.min(1, v / 100)).toFixed(2)})`;
  const fg = (v) => v != null && v >= 55 ? "#fff" : "hsl(220,10%,30%)";

  return (
    <EvidenceCard
      question="¿Cómo retiene y cuánto vale cada cohorte? (LTV real)"
      answer={r1 != null ? `Retención mes 1: ${r1.toFixed(0)}%` : "Cohortes disponibles"}
      answerTone="neutral"
      context={`Cada fila es la cohorte del mes de su primera compra; cada columna, los meses de vida. ${r3 != null ? `Retención media a 3 meses ${r3.toFixed(0)}%.` : ""} Léelo por fila (cómo envejece cada cohorte), no como serie.`}
      maturity="green"
      actions={[
        { verb: "investigar", rationale: "Compara cohortes: si las recientes retienen peor en mes 1-3, el problema es de onboarding/segunda compra, no de captación." },
        { verb: "crear", rationale: "Un flujo de segunda compra en las primeras semanas sube la retención temprana, que es la que más mueve el LTV." },
      ]}
      delay={delay}
      note="Retención = compradores activos de la cohorte / tamaño de la cohorte. Fuente: Connectif · cohort_retention."
    >
      <div className="overflow-x-auto -mx-1">
        <table className="text-[10px] border-separate" style={{ borderSpacing: "2px" }}>
          <thead>
            <tr>
              <th className="text-left font-semibold text-muted-foreground px-1 sticky left-0 bg-card">Cohorte</th>
              <th className="text-right font-semibold text-muted-foreground px-1">Tam.</th>
              {cols.map(c => <th key={c} className="text-center font-semibold text-muted-foreground px-1 w-8">m{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map(c => (
              <tr key={c.key}>
                <td className="text-left font-medium text-foreground px-1 whitespace-nowrap sticky left-0 bg-card">{M[c.month]} {String(c.year).slice(2)}</td>
                <td className="text-right font-mono text-muted-foreground px-1">{fmtNumber(c.size)}</td>
                {cols.map(lm => {
                  const v = ret(c, lm);
                  return (
                    <td key={lm} className="text-center rounded" style={{ background: bg(v), color: fg(v), minWidth: "2rem" }}>
                      {v == null ? "" : `${v.toFixed(0)}`}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </EvidenceCard>
  );
}
