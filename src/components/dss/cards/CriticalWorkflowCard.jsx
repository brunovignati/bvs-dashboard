import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { fmtNumber } from "@/lib/dashboardData";

const clip = (s, n) => { s = String(s || "").replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n) + "…" : s; };

export default function CriticalWorkflowCard({ workflows = [], anyStalled, hasData, delay }) {
  if (!hasData) {
    return (
      <EvidenceCard sources={["connectif"]}
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

  // ── Vista B — ANTIGÜEDAD: días desde el último envío de cada workflow crítico. La vista A dice
  // si hay alguno parado; esta ordena todos por frescura (0 = envió hoy) con el umbral de 3 días. ──
  const wfBars = workflows.slice(0, 8).map(w => ({ name: clip(w.name, 26), full: w.name, days: w.daysSince || 0, stalled: w.stalled }));
  const altView = wfBars.length ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={wfBars} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}d`} />
          <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [`${v} día(s) sin enviar`, "Antigüedad"]} labelFormatter={(l, p) => p?.[0]?.payload?.full || l} labelStyle={{ fontSize: 10 }} />
          <ReferenceLine x={3} stroke="hsl(0,70%,60%)" strokeDasharray="4 3" label={{ value: "parado ≥3d", position: "top", fontSize: 8, fill: "hsl(0,60%,45%)" }} />
          <Bar dataKey="days" radius={[0, 4, 4, 0]}>
            {wfBars.map((w, i) => <Cell key={i} fill={w.stalled ? "hsl(0,72%,52%)" : w.days >= 2 ? "hsl(37,42%,74%)" : "hsl(160,60%,42%)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
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
      altView={altView}
      viewLabels={{ a: "Estado", b: "Antigüedad" }}
      note="Crítico = workflows de carrito y reactivación/reabastecimiento (D15/D08). Regla de 'parado': tiene historial de ≥8 días con envíos y 0 envíos en los últimos 3 días. Vista 'Antigüedad' = días desde el último envío por workflow (rojo = parado ≥3d). Madura con el histórico diario."
    >
      <p className="text-[10px] text-muted-foreground/70 mb-1.5">Regla: <span className="font-semibold text-foreground">parado</span> = ≥8 días de envío en su historial y sin ningún envío en los últimos 3 días.</p>
      <div className="space-y-1.5 mt-1">
        {workflows.slice(0, 5).map((w, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-sm">
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
