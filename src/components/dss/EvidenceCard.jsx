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
import { useState } from "react";
import { motion } from "framer-motion";
import { MATURITY } from "@/lib/dss/dssUtils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function MaturityChip({ state = "green" }) {
  const m = MATURITY[state] || MATURITY.green;
  if (!m.label) return null; // "al día" no lleva chip: elimina el badge repetido
  return (
    <span title={m.tip}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls} whitespace-nowrap cursor-help`}>
      <span>{m.symbol}</span> {m.label}
    </span>
  );
}

// Color semántico de estado (prueba aprobada): verde/ámbar/rojo.
const PILL = {
  good: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  warn: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  bad:  "bg-red-500/10 text-red-600 border-red-500/20",
};
function StatusPill({ tone = "good", label }) {
  if (!label) return null;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${PILL[tone] || PILL.good}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${tone === "bad" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : "bg-emerald-500"}`} />
      {label}
    </span>
  );
}

// El enunciado principal se tiñe según su estado (semántico).
const TONE = {
  good:    "text-emerald-600",
  bad:     "text-red-600",
  warn:    "text-amber-600",
  neutral: "text-foreground",
};

// Delta con dirección semántica: sube = verde, baja = rojo.
function Delta({ value, suffix = "%" }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = value > 0 ? "text-emerald-600" : value < 0 ? "text-red-600" : "text-muted-foreground";
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
  status,                 // { tone:'good'|'warn'|'bad', label } — pill de estado explícito
  delay = 0,              // (compat; sin animación)
}) {
  const [showNote, setShowNote] = useState(false);
  // Estado semántico: explícito > riesgo (severity) > answerTone malo. Verde no lleva pill (solo se marcan excepciones).
  const statusPill = status
    ? status
    : severity
      ? { tone: "bad", label: "En riesgo" }
      : answerTone === "bad"
        ? { tone: "warn", label: "Vigilar" }
        : null;
  const showMaturity = !statusPill && MATURITY[maturity] && MATURITY[maturity].label;
  // Sin borde grueso: el estado se comunica con el pill (En riesgo/Vigilar), no con el borde.
  const leftBorder = "";
  const rec = action
    ? { rationale: action }
    : (actions && actions.length ? actions[0] : null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: delay || 0, ease: [0.22, 1, 0.36, 1] }}
      className={`h-full bg-card border border-border/70 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30 ${leftBorder}`}>
      {/* 1. Pregunta + estado */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold leading-snug text-foreground">{question}</h3>
        {statusPill ? <StatusPill tone={statusPill.tone} label={statusPill.label} /> : showMaturity ? <MaturityChip state={maturity} /> : null}
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

      {/* Acción — ÚNICO bloque tras el dato. La fuente y el método se consultan en una
          burbuja que se abre desde el asterisco (*) al final de la acción. */}
      {(rec || note) && (
        <div className="mt-4 relative">
          <div className="flex items-start gap-2 rounded-xl bg-primary/[0.06] border border-primary/15 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-primary mt-0.5 shrink-0">Acción</span>
            <p className="text-sm text-foreground/90 leading-snug">
              {rec ? (
                <>
                  {rec.verb && <span className="font-semibold capitalize">{rec.verb} · </span>}
                  {rec.rationale}
                </>
              ) : "Sin acción hoy."}
              {note && (
                <button
                  type="button"
                  onClick={() => setShowNote((v) => !v)}
                  aria-label="Ver fuente y método"
                  title="Fuente y método"
                  className="ml-0.5 align-super text-[12px] font-bold text-primary hover:opacity-70 cursor-pointer">*</button>
              )}
            </p>
          </div>

          {/* Burbuja de fuente y método */}
          {showNote && note && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowNote(false)} aria-hidden="true" />
              <div className="absolute right-0 z-40 mt-1.5 w-72 max-w-[85vw] bg-popover border border-border rounded-xl shadow-lg p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Fuente y método</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed italic">{note}</p>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
