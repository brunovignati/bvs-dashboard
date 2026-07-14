import { ComposedChart, Area, Line, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { fmtCurrency } from "@/lib/dashboardData";

export default function RevenueDailyCard({ series = [], lastValue, mean, std, outside, direction, delay }) {
  const lo = Math.max(0, mean - 2 * std);
  const hi = mean + 2 * std;

  // ── Vista B — DESVIACIÓN diaria respecto a la media de 28 días. La vista A muestra el nivel;
  // esta resalta cuánto se aleja cada día de lo normal (magnitud y signo de la anomalía). ──
  const devData = series.map(p => ({ name: p.name, dev: (p.value || 0) - mean }));
  const altView = devData.length >= 2 ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={devData} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(devData.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v >= 0 ? "+" : "−"}€${Math.abs(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v) => [`${v >= 0 ? "+" : "−"}${fmtCurrency(Math.abs(v))} vs media`, "Desviación"]} labelStyle={{ fontSize: 11 }} />
          <ReferenceLine y={0} stroke="hsl(220,13%,70%)" />
          {std > 0 && <ReferenceLine y={2 * std} stroke="hsl(0,70%,60%)" strokeDasharray="4 3" strokeOpacity={0.5} />}
          {std > 0 && <ReferenceLine y={-2 * std} stroke="hsl(0,70%,60%)" strokeDasharray="4 3" strokeOpacity={0.5} />}
          <Bar dataKey="dev" radius={[2, 2, 0, 0]}>
            {devData.map((d, i) => {
              const anom = std > 0 && Math.abs(d.dev) > 2 * std;
              return <Cell key={i} fill={d.dev >= 0 ? (anom ? "hsl(160,60%,38%)" : "hsl(160,45%,72%)") : (anom ? "hsl(0,72%,52%)" : "hsl(16,60%,78%)")} />;
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;
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
    <EvidenceCard sources={["connectif"]}
      question="¿El revenue de ayer está dentro del rango normal?"
      answer={answer}
      answerTone={answerTone}
      context={context}
      maturity="green"
      severity={outside && direction < 0 ? "high" : undefined}
      actions={actions}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Serie", b: "Desviación" }}
      note="Banda = media móvil 28 días ± 2σ sobre revenue diario (D17). Vista 'Desviación' = revenue de cada día menos la media 28d; las líneas rojas marcan ±2σ y las barras intensas, los días fuera de banda."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={series} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false}
              interval={Math.max(1, Math.floor(series.length / 8))} />
            <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false}
              tickFormatter={(v) => `€${(v/1000).toFixed(0)}K`} />
            <Tooltip formatter={(v) => [fmtCurrency(v), "Revenue"]} labelStyle={{ fontSize: 11 }} />
            {std > 0 && <ReferenceArea y1={lo} y2={hi} fill="hsl(30,72%,66%)" fillOpacity={0.06} />}
            <Area type="monotone" dataKey="value" stroke="hsl(16,79%,57%)" fill="hsl(16,79%,57%)" fillOpacity={0.12} strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
