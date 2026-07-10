/**
 * EvidenceCard — el bloque canónico ÚNICO del dashboard.
 *
 * Estructura fija e idéntica en TODOS los bloques y subloques (no desviarse):
 *   1. Pregunta de negocio (encabezado)        + chip de estado del dato
 *   2. KPI principal (1–3 métricas)            (prop `kpis` o `answer`)
 *   3. Visualización (elemento dominante)      (children)
 *   4. Insight — qué significa                 (prop `insight`, opcional)
 *   5. Acción recomendada — qué hacer          (prop `action` o `actions[0]`)
 *   6. Fuente del dato                         (prop `note`)
 *
 * Escala tipográfica fija: pregunta = text-base/semibold · KPI = text-3xl/bold ·
 * insight = text-sm · acción = text-sm · fuente = text-[10px]. Paleta de dos colores.
 */
import { MATURITY } from "@/lib/dss/dssUtils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function MaturityChip({ state = "green" }) {
  const m = MATURITY[state] || MATURITY.green;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls} whitespace-nowrap`}>
      <span>{m.symbol}</span> {m.label}
    </span>
  );
}

const TONE = {
  good:    "text-blue-600",         // ↑ predominante
  bad:     "text-muted-foreground", // ↓ neutro
  warn:    "text-foreground",
  neutral: "text-foreground",
};

// Delta en paleta de dos colores: sube = predominante, baja = neutro.
function Delta({ value, suffix = "%" }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = value > 0 ? "text-primary" : "text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{value > 0 ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
}

export default function EvidenceCard({
  question,
  kpis,                   // [{ value, label, delta?, deltaSuffix? }] — franja de 1–3 KPIs
  answer,                 // KPI único (fallback si no hay `kpis`)
  answerTone = "neutral",
  context,                // matiz breve bajo el KPI (período, deltas)
  maturity = "green",
  severity,               // 'high'|'medium' resalta el borde izquierdo
  insight,                // 4. qué significa
  action,                 // 5. qué hacer (string). Si no, se usa actions[0]
  actions = [],           // [{ verb, rationale }]
  note,                   // 6. fuente del dato
  children,               // 3. la visualización
  delay = 0,              // (compat; sin animación)
}) {
  const leftBorder = severity ? "border-l-4 border-l-slate-500" : "";
  const rec = action
    ? { rationale: action }
    : (actions && actions.length ? actions[0] : null);
  const hasFooter = insight || rec;

  return (
    <div className={`bg-card border border-border rounded-2xl p-5 ${leftBorder}`}>
      {/* 1. Pregunta + estado */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold leading-snug text-foreground">{question}</h3>
        <MaturityChip state={maturity} />
      </div>

      {/* 2. KPI principal (franja o único) */}
      {kpis && kpis.length > 0 ? (
        <div className="flex flex-wrap gap-x-8 gap-y-3">
          {kpis.slice(0, 3).map((k, i) => (
            <div key={i}>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold font-heading leading-none tracking-tight">{k.value}</span>
                {k.delta !== undefined && <Delta value={k.delta} suffix={k.deltaSuffix} />}
              </div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mt-1.5">{k.label}</p>
            </div>
          ))}
        </div>
      ) : (answer !== undefined && answer !== null) ? (
        <div className={`text-2xl font-bold font-heading leading-tight ${TONE[answerTone] || TONE.neutral}`}>{answer}</div>
      ) : null}
      {context && <p className="text-xs text-muted-foreground mt-1.5">{context}</p>}

      {/* 3. Visualización (elemento dominante) */}
      {children && <div className="mt-4">{children}</div>}

      {/* 4. Insight + 5. Acción */}
      {hasFooter && (
        <div className="mt-4 pt-3 border-t border-border space-y-1.5">
          {insight && <p className="text-sm text-foreground/90 leading-snug">{insight}</p>}
          {rec && (
            <p className="text-sm text-muted-foreground leading-snug">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-primary mr-1.5">Acción</span>
              {rec.verb && <span className="font-semibold text-foreground capitalize">{rec.verb} · </span>}
              {rec.rationale}
            </p>
          )}
        </div>
      )}

      {/* 6. Fuente */}
      {note && <p className="text-[10px] text-muted-foreground mt-3 italic">{note}</p>}
    </div>
  );
}
