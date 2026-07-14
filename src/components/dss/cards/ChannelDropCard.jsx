import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";

const CH_COLOR = { Email: "hsl(16,79%,57%)", Push: "hsl(30,72%,66%)", Web: "hsl(186,32%,42%)", SMS: "hsl(45,35%,46%)" };

export default function ChannelDropCard({ channels, worst, hasAttribution, delay }) {
  if (!hasAttribution) {
    return (
      <EvidenceCard sources={["connectif"]}
        question="¿Algún canal atribuido se desplomó de un día a otro?"
        answer="Sin atribución diaria"
        answerTone="neutral"
        context="daily_revenue no expone atribución por canal a nivel diario."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Confirma que el sync incluya las columnas de atribución (email/push/web/sms) en daily_revenue." }]}
        delay={delay}
      />
    );
  }
  const anyDrop = worst && worst.delta < -25;
  const answer = anyDrop ? `${worst.name} ${worst.delta.toFixed(0)}%` : "Sin caídas bruscas";
  const context = anyDrop
    ? `Las compras atribuidas a ${worst.name} cayeron ${Math.abs(worst.delta).toFixed(0)}% frente a su media de 14 días.`
    : "Ningún canal cae más de un 25% respecto a su media reciente.";

  // ── Vista B — REPARTO: compras atribuidas del último día vs su media de 14 días, por canal. La
  // vista A muestra el % de variación; esta muestra el peso absoluto (qué canal aporta cuánto). ──
  const hasAbs = channels.some(c => (c.cur || 0) > 0 || (c.base || 0) > 0);
  const altView = hasAbs ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={channels} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => v.toFixed(0)} />
          <Tooltip formatter={(v, n) => [`${Number(v).toFixed(1)} compras`, n]} labelStyle={{ fontSize: 11 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey="base" name="Media 14d" fill="hsl(37,42%,80%)" radius={[3, 3, 0, 0]} maxBarSize={26} />
          <Bar dataKey="cur" name="Último día" radius={[3, 3, 0, 0]} maxBarSize={26}>
            {channels.map((c, i) => <Cell key={i} fill={CH_COLOR[c.name] || "hsl(16,79%,57%)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Algún canal atribuido se desplomó de un día a otro?"
      answer={answer}
      answerTone={anyDrop ? "bad" : "good"}
      context={context}
      maturity="green"
      severity={anyDrop ? "medium" : undefined}
      actions={anyDrop
        ? [{ verb: "investigar", rationale: `Comprueba si ${worst.name} tuvo un fallo de envío, tracking o una campaña que terminó.` },
           { verb: "escalar", rationale: "Si el canal está sano, refuerza el que compensa la caída." }]
        : [{ verb: "mantener", rationale: "Mix de canal estable; sin acción hoy." }]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Variación", b: "Reparto" }}
      note="Δ = compras atribuidas del último día vs. media de 14 días, por canal (D17). Vista 'Reparto' = compras atribuidas del último día (color) frente a su media de 14 días (barra clara), por canal."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={channels} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(0)}%`, "Δ vs. media 14d"]} labelStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="hsl(220,13%,70%)" />
            <Bar dataKey="delta" radius={[3, 3, 0, 0]}>
              {channels.map((c, i) => (
                <Cell key={i} fill={c.delta < -25 ? "hsl(186,32%,26%)" : c.delta < 0 ? "hsl(37,42%,74%)" : "hsl(30,72%,66%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
