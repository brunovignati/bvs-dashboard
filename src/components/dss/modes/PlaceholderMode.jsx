import ModeHeader from "../ModeHeader";
import { MATURITY } from "@/lib/dss/dssUtils";
import { Clock } from "lucide-react";

/**
 * PlaceholderMode — modos de Fase 2 (Estratega, Dirección) y Biblioteca.
 * Se muestran ya en la navegación con las tarjetas previstas, para que el plano
 * esté completo aunque el contenido llegue por fases (Doc. 3).
 */
export default function PlaceholderMode({ title, cadence, question, blurb, phase, cards = [] }) {
  return (
    <div className="space-y-4">
      <ModeHeader title={title} cadence={cadence} question={question} blurb={blurb} />

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
        <Clock className="w-5 h-5 text-amber-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-700">Previsto en {phase}</p>
          <p className="text-xs text-muted-foreground">Tarjetas ya diseñadas (Doc. 1 · Registro de Decisiones). Se activan en su fase del roadmap.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((c, i) => {
          const m = MATURITY[c.maturity] || MATURITY.green;
          return (
            <div key={i} className="bg-card/60 border border-dashed border-border rounded-2xl p-5">
              <div className="flex items-start justify-between gap-3 mb-1">
                <h3 className="text-sm font-semibold text-foreground/80 leading-snug">{c.q}</h3>
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls} whitespace-nowrap`}>
                  {m.symbol} {m.label}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{c.viz}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
