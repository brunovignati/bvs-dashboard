/**
 * KpiBand — banda-resumen de 4 KPIs al inicio de cada vista (el "titular").
 * Cada item: { label, value, delta?, deltaSuffix?, deltaGood?, hint, tone, Icon }
 *  - tone: 'good'|'warn'|'bad'|undefined → tiñe la cifra cuando hay riesgo.
 *  - deltaGood: si es false, invierte el color del delta (p.ej. la baja: subir = malo).
 */
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

function Delta({ value, suffix = "%", good = true }) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const positive = value > 0;
  const isGood = value === 0 ? null : positive === good;
  const Icon = positive ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = isGood === null ? "text-muted-foreground" : isGood ? "text-emerald-600" : "text-red-600";
  return (
    <span className={`inline-flex items-center gap-0.5 font-semibold ${color}`}>
      <Icon className="w-3 h-3" />{positive ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
}

export default function KpiBand({ items = [] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((k, i) => (
        <motion.div key={i}
          initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.3, delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
          className={`bg-card border rounded-2xl p-4 shadow-sm ${k.tone === "bad" ? "border-red-500/30" : "border-border/70"}`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground leading-tight">{k.label}</p>
            {k.Icon && (
              <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${k.tone === "bad" ? "bg-red-500/10 text-red-600" : "bg-primary/10 text-primary"}`}>
                <k.Icon className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
          <p className={`text-2xl md:text-3xl font-bold font-heading leading-none tracking-tight mt-2 ${k.tone === "bad" ? "text-red-600" : "text-foreground"}`}>
            {k.value}
          </p>
          {(k.delta !== undefined || k.hint) && (
            <div className="mt-2 flex items-center gap-1.5 text-xs">
              {k.delta !== undefined && <Delta value={k.delta} suffix={k.deltaSuffix} good={k.deltaGood !== false} />}
              {k.hint && <span className="text-muted-foreground">{k.hint}</span>}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
