/**
 * AlertRibbon — cinta de señales priorizadas del motor de reglas (Fase 1: reglas fijas).
 * Recibe un array de señales ya ordenadas por severidad/prioridad y las muestra arriba
 * del modo. Si no hay señales, muestra un estado de "todo en orden".
 */
import { SEVERITY } from "@/lib/dss/dssUtils";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

export default function AlertRibbon({ signals = [] }) {
  const active = signals.filter(s => s.severity !== "ok");

  if (active.length === 0) {
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-emerald-700">Sin señales críticas hoy</p>
          <p className="text-xs text-muted-foreground">Ninguna regla ha cruzado su umbral. Puedes cerrar tranquilo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-600" />
        <p className="text-sm font-semibold text-foreground">Requiere tu atención hoy</p>
        <span className="text-[10px] text-muted-foreground">· ordenado por prioridad</span>
      </div>
      <div className="space-y-2">
        {active.map((s, i) => {
          const sev = SEVERITY[s.severity] || SEVERITY.low;
          return (
            <div key={i} className={`flex items-start gap-3 border-l-4 ${sev.cls} bg-muted/30 rounded-r-lg pl-3 pr-3 py-2`}>
              <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${sev.dot}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-foreground">{s.title}</p>
                {s.detail && <p className="text-[11px] text-muted-foreground">{s.detail}</p>}
              </div>
              {s.verb && (
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide shrink-0 mt-0.5">
                  {s.verb}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
