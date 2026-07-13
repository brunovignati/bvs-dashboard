/**
 * EvidenceCard — bloque canónico ÚNICO del dashboard.
 *   1. Pregunta + distintivo(s) de fuente + asterisco (abre "fuente y método")
 *   2. KPI principal (kpis o answer)
 *   3. Visualización (children)
 *   4. Acción — OCULTA por defecto; se muestra/oculta con el icono de ojo.
 * Estado semántico por pill (verde/ámbar/rojo). Sin bordes gruesos.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { MATURITY } from "@/lib/dss/dssUtils";
import { TrendingUp, TrendingDown, Minus, Eye, EyeOff } from "lucide-react";

// ── Distintivos de fuente (marca por color + inicial; no son los logos oficiales) ──
const SOURCES = {
  connectif: { short: "C", title: "Connectif", cls: "bg-[#2f5c9e] text-white" },
  ga4:       { short: "GA", title: "Google Analytics", cls: "bg-[#e8730b] text-white" },
  metricool: { short: "M", title: "Metricool", cls: "bg-[#c9f24d] text-neutral-900" },
};
function detectSources(note) {
  if (!note) return [];
  const out = [];
  if (/connectif/i.test(note)) out.push("connectif");
  if (/ga4|google analytics|analytics/i.test(note)) out.push("ga4");
  if (/metricool/i.test(note)) out.push("metricool");
  return out;
}
function SourceBadges({ ids }) {
  if (!ids.length) return null;
  return (
    <span className="inline-flex items-center gap-1 ml-1.5 align-middle">
      {ids.map((id) => {
        const s = SOURCES[id];
        return (
          <span key={id} title={`Fuente: ${s.title}`}
            className={`inline-flex items-center justify-center h-4 min-w-4 px-1 rounded text-[9px] font-bold leading-none ${s.cls}`}>
            {s.short}
          </span>
        );
      })}
    </span>
  );
}

function MaturityChip({ state = "green" }) {
  const m = MATURITY[state] || MATURITY.green;
  if (!m.label) return null;
  return (
    <span title={m.tip}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls} whitespace-nowrap cursor-help`}>
      <span>{m.symbol}</span> {m.label}
    </span>
  );
}

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

const TONE = { good: "text-emerald-600", bad: "text-red-600", warn: "text-amber-600", neutral: "text-foreground" };

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
  kpis,
  answer,
  answerTone = "neutral",
  context,
  maturity = "green",
  severity,
  insight,               // (compat; ya no se renderiza)
  action,
  actions = [],
  note,
  children,
  status,
  delay = 0,
}) {
  const [showNote, setShowNote] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const statusPill = status
    ? status
    : severity ? { tone: "bad", label: "En riesgo" }
    : answerTone === "bad" ? { tone: "warn", label: "Vigilar" }
    : null;
  const showMaturity = !statusPill && MATURITY[maturity] && MATURITY[maturity].label;
  const rec = action ? { rationale: action } : (actions && actions.length ? actions[0] : null);
  const sources = detectSources(note);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay: delay || 0, ease: [0.22, 1, 0.36, 1] }}
      className="h-full bg-card border border-border/70 rounded-2xl p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/30">
      {/* 1. Pregunta + fuente(s) + asterisco */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold leading-snug text-foreground">
          {question}
          {note && (
            <span className="relative inline-block">
              <button type="button" onClick={() => setShowNote((v) => !v)} aria-label="Fuente y método" title="Fuente y método"
                className="align-super text-[12px] font-bold text-primary hover:opacity-70 cursor-pointer ml-0.5">*</button>
              {showNote && (
                <>
                  <span className="fixed inset-0 z-30" onClick={() => setShowNote(false)} aria-hidden="true" />
                  <span className="absolute left-0 top-full mt-1.5 z-40 block w-64 max-w-[80vw] bg-popover border border-border rounded-xl shadow-lg p-3 text-left font-normal">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1">Fuente y método</span>
                    <span className="block text-[11px] text-muted-foreground leading-relaxed italic">{note}</span>
                  </span>
                </>
              )}
            </span>
          )}
          <SourceBadges ids={sources} />
        </h3>
        {statusPill ? <StatusPill tone={statusPill.tone} label={statusPill.label} /> : showMaturity ? <MaturityChip state={maturity} /> : null}
      </div>

      {/* 2. KPI principal */}
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

      {/* 3. Visualización */}
      {children && <div className="mt-4">{children}</div>}

      {/* 4. Acción — oculta por defecto; se revela con el ojo */}
      {rec && (
        <div className="mt-4">
          <button type="button" onClick={() => setShowAction((v) => !v)}
            aria-label={showAction ? "Ocultar acción" : "Ver acción"} title={showAction ? "Ocultar" : "Ver acción"}
            className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
            {showAction ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          {showAction && (
            <div className="mt-2 rounded-xl bg-primary/[0.06] border border-primary/15 px-3 py-2">
              <p className="text-sm text-foreground/90 leading-snug">
                {rec.verb && <span className="font-semibold capitalize">{rec.verb} · </span>}
                {rec.rationale}
              </p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
