import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";

export default function EmailDeliverabilityCard({ series, lastRate, mean, drop, delay, hasData }) {
  if (!hasData) {
    return (
      <EvidenceCard
        question="¿Cayó la entregabilidad o la apertura de email?"
        answer="Sin datos diarios de email"
        answerTone="neutral"
        context="La tabla daily_email aún no tiene profundidad suficiente."
        maturity="amber"
        actions={[{ verb: "investigar", rationale: "Verifica que el sync diario de email esté poblando daily_email." }]}
        delay={delay}
      />
    );
  }
  const answerTone = drop ? "bad" : "good";
  const answer = `${lastRate.toFixed(1)}%`;
  const context = drop
    ? `Por debajo de la media reciente (${mean.toFixed(1)}%). Posible problema de entregabilidad.`
    : `En línea con la media reciente (${mean.toFixed(1)}%).`;

  return (
    <EvidenceCard
      question="¿Cayó la entregabilidad o la apertura de email?"
      answer={answer}
      answerTone={answerTone}
      context={context}
      maturity="green"
      severity={drop ? "medium" : undefined}
      actions={drop
        ? [{ verb: "investigar", rationale: "Caída de open rate puede indicar bloqueo de dominio, spam-trap o problema de reputación. Revisa entregabilidad." }]
        : [{ verb: "mantener", rationale: "Apertura estable; sin acción hoy." }]}
      delay={delay}
      note="Open rate diario agregado = aperturas / envíos (D08)."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
              interval={Math.max(1, Math.floor(series.length / 8))} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `${v.toFixed(0)}%`} domain={[0, "auto"]} />
            <Tooltip formatter={(v) => [`${Number(v).toFixed(1)}%`, "Open rate"]} labelStyle={{ fontSize: 11 }} />
            {mean > 0 && <ReferenceLine y={mean} stroke="hsl(220,13%,70%)" strokeDasharray="4 4"
              label={{ value: `media ${mean.toFixed(0)}%`, position: "right", fontSize: 8, fill: "hsl(220,10%,50%)" }} />}
            <Line type="monotone" dataKey="value" stroke="hsl(220,55%,62%)" strokeWidth={1.8} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
