/**
 * EvidenceCard — el átomo visual del Decision Support System.
 *
 * Anatomía fija (Doc. 1 §3.4 / Doc. 2 §4):
 *   Pregunta + badge de madurez  →  Respuesta  →  Contexto  →  Evidencia  →  Posibles acciones
 *
 * La fila "Posibles acciones" es OBLIGATORIA: una tarjeta sin acciones no debe existir.
 * El componente no dicta la acción; ofrece verbos con su racional heurístico.
 */
import { motion } from "framer-motion";
import { MATURITY, VERBS } from "@/lib/dss/dssUtils";

function MaturityChip({ state = "green" }) {
  const m = MATURITY[state] || MATURITY.green;
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls} whitespace-nowrap`}>
      <span>{m.symbol}</span> {m.label}
    </span>
  );
}

function ActionChip({ verb }) {
  const v = VERBS[verb] || VERBS.investigar;
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-md border ${v.cls}`}>
      {v.label}
    </span>
  );
}

const TONE = {
  good:    "text-emerald-600",
  bad:     "text-red-600",
  warn:    "text-amber-600",
  neutral: "text-foreground",
};

export default function EvidenceCard({
  question,
  answer,
  answerTone = "neutral",
  context,
  maturity = "green",
  severity,               // opcional: 'high'|'medium' resalta el borde izquierdo
  actions = [],           // [{ verb, rationale }]
  note,                   // nota al pie (p.ej. explicación de la puerta del dato)
  children,               // la evidencia (gráfico)
  delay = 0,
}) {
  const leftBorder =
    severity === "high"   ? "border-l-4 border-l-red-500" :
    severity === "medium" ? "border-l-4 border-l-amber-500" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={`bg-card border border-border rounded-2xl p-5 ${leftBorder}`}
    >
      {/* Cabecera: pregunta + madurez */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold leading-snug text-foreground">{question}</h3>
        <MaturityChip state={maturity} />
      </div>

      {/* Respuesta + contexto */}
      {answer !== undefined && answer !== null && (
        <div className="mb-1">
          <div className={`text-2xl font-bold font-heading leading-tight ${TONE[answerTone] || TONE.neutral}`}>
            {answer}
          </div>
          {context && <p className="text-xs text-muted-foreground mt-0.5">{context}</p>}
        </div>
      )}

      {/* Evidencia */}
      {children && <div className="mt-3">{children}</div>}

      {/* Nota (p.ej. madurez / limitación de dato) */}
      {note && <p className="text-[10px] text-muted-foreground mt-2 italic">{note}</p>}

      {/* Posibles acciones (obligatorio) */}
      {actions.length > 0 && (
        <div className="mt-4 pt-3 border-t border-border/60">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Decisiones que apoya esta evidencia</p>
          <div className="space-y-1.5">
            {actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2">
                <ActionChip verb={a.verb} />
                {a.rationale && <span className="text-xs text-muted-foreground leading-snug pt-0.5">{a.rationale}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
