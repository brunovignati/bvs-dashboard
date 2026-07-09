import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useSubscribers, usePushSubscribers } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function BaseHealthCard({ delay }) {
  const { data: subs = [] } = useSubscribers();
  const { data: push = [] } = usePushSubscribers();

  // Base de email suscrita por mes (status = subscribed) + neto (increment)
  const emailSubs = subs.filter(s => s.status === "subscribed")
    .sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map(s => ({ k: s.year * 12 + s.month, name: `${M[s.month]} ${String(s.year).slice(2)}`, base: s.contacts || 0, neto: s.increment || 0 }));
  const pushMap = {};
  for (const p of push) pushMap[p.year * 12 + p.month] = p.contacts || 0;

  const rows = emailSubs.map(e => ({ ...e, push: pushMap[e.k] || 0 })).slice(-18);
  const hasData = rows.length >= 2;
  const last = rows[rows.length - 1];

  return (
    <EvidenceCard
      question="¿Está sana la base de contactos?"
      answer={hasData ? `${fmtNumber(last.base)} suscriptores` : "Sin datos"}
      answerTone={hasData ? (last.neto >= 0 ? "good" : "bad") : "neutral"}
      context={hasData ? `Email · neto del mes ${last.neto >= 0 ? "+" : ""}${fmtNumber(last.neto)} · push ${fmtNumber(last.push)}` : undefined}
      maturity="green"
      actions={[
        { verb: "investigar", rationale: hasData && last.neto < 0 ? "Base decreciente: revisa frecuencia de envío y campañas con más bajas." : "Base creciente: mantén el equilibrio envío/captación." },
        { verb: "mantener", rationale: "Vigila que las altas superen a las bajas mes a mes." },
      ]}
      delay={delay}
      note="Suscriptores email (status=subscribed) y push por mes (Connectif · subscribers / push_subscribers). Neto = altas − bajas."
    >
      {hasData && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={rows} margin={{ top: 5, right: 40, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                interval={Math.max(1, Math.floor(rows.length / 8))} />
              <YAxis yAxisId="l" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
              <YAxis yAxisId="r" orientation="right" tick={{ fontSize: 8, fill: "hsl(220,10%,50%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n) => [fmtNumber(v), n]} labelStyle={{ fontSize: 11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <ReferenceLine yAxisId="r" y={0} stroke="hsl(220,13%,80%)" />
              <Bar yAxisId="r" dataKey="neto" name="Neto mensual" radius={[3, 3, 0, 0]} fill="hsl(160,84%,39%)" fillOpacity={0.5} />
              <Line yAxisId="l" type="monotone" dataKey="base" name="Base email" stroke="hsl(217,91%,60%)" strokeWidth={2.2} dot={false} />
              <Line yAxisId="l" type="monotone" dataKey="push" name="Base push" stroke="hsl(280,65%,60%)" strokeWidth={1.8} dot={false} strokeDasharray="5 3" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
