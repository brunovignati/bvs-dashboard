import { ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { fmtCurrency } from "@/lib/dashboardData";

export default function RevenueDailyCard({ series, lastValue, mean, std, outside, direction, delay }) {
  const lo = Math.max(0, mean - 2 * std);
  const hi = mean + 2 * std;
  const answerTone = outside ? (direction < 0 ? "bad" : "good") : "neutral";
  const answer = fmtCurrency(lastValue);
  const context = outside
    ? `Fuera de la banda esperada (€${(lo/1000).toFixed(1)}K–€${(hi/1000).toFixed(1)}K). ${direction < 0 ? "Caída" : "Pico"} anómalo respecto a las últimas 4 semanas.`
    : `Dentro del rango normal (media 28d ${fmtCurrency(mean)} ± banda).`;

  const actions = outside
    ? [{ verb: "investigar", rationale: direction < 0
        ? "Revisa si hubo rotura de stock, fallo de tracking o caída de campaña activa."
        : "Confirma el origen del pico (promoción, Black Friday) para poder replicarlo." }]
    : [{ verb: "mantener", rationale: "Sin anomalía: ninguna acción urgente hoy." }];

  return (
    <EvidenceCard
      question="¿El revenue de ayer está dentro del rango normal?"
      answer={answer}
      answerTone={answerTone}
      context={context}
      maturity="green"
      severity={outside && direction < 0 ? "high" : undefined}
      actions={actions}
      delay={delay}
      note="Banda = media móvil 28 días ± 2σ sobre revenue diario (D17)."
    >
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="dssRevGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(217,91%,60%)" stopOpacity={0.25} />
                <stop offset="95%" stopColor="hsl(217,91%,60%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
              interval={Math.max(1, Math.floor(series.length / 8))} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => [fmtCurrency(v), "Revenue"]} labelStyle={{ fontSize: 11 }} />
            {std > 0 && <ReferenceArea y1={lo} y2={hi} fill="hsl(160,84%,39%)" fillOpacity={0.06} />}
            <Area type="monotone" dataKey="value" stroke="hsl(217,91%,60%)" fill="url(#dssRevGrad)" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
