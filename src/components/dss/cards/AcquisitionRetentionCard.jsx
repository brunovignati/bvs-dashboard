import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useBuyerCohorts } from "@/lib/useEntities";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function AcquisitionRetentionCard({ delay }) {
  const { data = [] } = useBuyerCohorts();
  const rows = [...data].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month)
    .map(r => {
      const ft = r.firstTime || 0, rc = r.recurring || 0, tot = ft + rc;
      return { name: `${M[r.month]} ${String(r.year).slice(2)}`, ft, rc,
        pctRec: tot ? (rc / tot) * 100 : 0, pctNew: tot ? (ft / tot) * 100 : 0 };
    });
  const hasData = rows.length >= 2;
  const last = rows[rows.length - 1];
  const first = rows[0];
  const trend = hasData ? last.pctRec - first.pctRec : 0;

  return (
    <EvidenceCard
      question="¿Dependemos de adquisición o de retención?"
      answer={hasData ? `${last.pctRec.toFixed(0)}% recurrentes` : "Sin datos"}
      answerTone={hasData ? (last.pctRec >= 60 ? "good" : last.pctRec >= 40 ? "warn" : "bad") : "neutral"}
      context={hasData ? `${M[last.month]} ${last.year} · ${last.pctNew.toFixed(0)}% primerizos · tendencia de recurrencia ${trend >= 0 ? "+" : ""}${trend.toFixed(0)} pts desde el inicio` : undefined}
      maturity="green"
      actions={[
        { verb: "reasignar", rationale: hasData && last.pctRec < 50 ? "Alta dependencia de captación: refuerza retención (automatizaciones, CRM)." : "Base fiel: sostén la captación sin descuidar la fidelización." },
        { verb: "crear", rationale: "Si la recurrencia cae, considera un programa de fidelización." },
      ]}
      delay={delay}
      note="Mix mensual de compradores primerizos vs. recurrentes (Connectif · buyer_cohorts). La retención real por cohorte exige Contact ID (no disponible)."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows.slice(-18)} stackOffset="expand" margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false}
                interval={Math.max(1, Math.floor(Math.min(rows.length, 18) / 8))} />
              <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false}
                tickFormatter={v => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v, n) => [Math.round(v), n]} labelStyle={{ fontSize: 11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="rc" name="Recurrentes" stackId="1" stroke="hsl(30,72%,66%)" fill="hsl(30,72%,66%)" fillOpacity={0.7} />
              <Area type="monotone" dataKey="ft" name="Primerizos" stackId="1" stroke="hsl(16,79%,57%)" fill="hsl(16,79%,57%)" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
