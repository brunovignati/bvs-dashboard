import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";

export default function ChannelDropCard({ channels, worst, hasAttribution, delay }) {
  if (!hasAttribution) {
    return (
      <EvidenceCard
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

  return (
    <EvidenceCard
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
      note="Δ = compras atribuidas del último día vs. media de 14 días, por canal (D17)."
    >
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={channels} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`} />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(0)}%`, "Δ vs. media 14d"]} labelStyle={{ fontSize: 11 }} />
            <ReferenceLine y={0} stroke="hsl(220,13%,70%)" />
            <Bar dataKey="delta" radius={[3, 3, 0, 0]}>
              {channels.map((c, i) => (
                <Cell key={i} fill={c.delta < -25 ? "hsl(224,76%,42%)" : c.delta < 0 ? "hsl(218,33%,70%)" : "hsl(220,55%,62%)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
