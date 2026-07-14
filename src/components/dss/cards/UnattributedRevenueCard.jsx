import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { MATURITY, upToCutoff } from "@/lib/dss/dssUtils";
import { useDailyRevenue, useGa4Daily } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP, LEGEND, SERIES, STACK_FILL_OPACITY } from "@/lib/dss/chartTheme";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const SRC = /source|medium|channel|organic|direct|paid|referral|social/i;
const EXCLUDE = new Set(["date_str","year","month","day","updated_at","created_at","id"]);

export default function UnattributedRevenueCard({ delay }) {
  const { data: dataRaw = [] } = useDailyRevenue();
  const { data: ga4Raw = [] } = useGa4Daily();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const data = upToCutoff(dataRaw, cutoff);
  const ga4 = upToCutoff(ga4Raw, cutoff);

  // Connectif: no atribuido = total compras − Σ atribuidas, por mes
  const byM = {};
  for (const r of data) { const k=r.year*12+r.month; if(!byM[k]) byM[k]={k,year:r.year,month:r.month,tot:0,attr:0};
    byM[k].tot += r.purchases||0;
    byM[k].attr += (r.emailAttr||0)+(r.pushAttr||0)+(r.webAttr||0)+(r.smsAttr||0); }
  const rows = Object.values(byM).sort((a,b)=>a.k-b.k).map(m=>{
    const noattr = Math.max(0, m.tot - m.attr);
    return { name:`${M[m.month]} ${String(m.year).slice(2)}`, Atribuido:m.attr, "No atribuido":noattr,
      pct: m.tot? (noattr/m.tot)*100 : 0 };
  }).slice(-18);
  const hasData = rows.length >= 2;
  const last = rows[rows.length-1];

  // ── Vista B — % no atribuido en el tiempo: ¿mejora la atribución? La proporción, no el
  // volumen. Mismo dato/periodo (pct ya calculado por mes). ──
  const altView = hasData ? (
    <div className={CHART_H}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
          <CartesianGrid {...GRID} />
          <XAxis dataKey="name" {...AXIS} interval={Math.max(1,Math.floor(rows.length/8))} />
          <YAxis {...AXIS} domain={[0,100]} tickFormatter={v=>`${v.toFixed(0)}%`} />
          <Tooltip formatter={(v)=>[`${Number(v).toFixed(1)}%`,"No atribuido"]} {...TIP} />
          <Line type="monotone" dataKey="pct" name="% sin atribuir" stroke="hsl(16,79%,57%)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  // GA4: ¿hay columnas de fuente/canal para explicar el no atribuido?
  const ga4Sample = ga4[ga4.length-1] || {};
  const ga4SourceKeys = Object.keys(ga4Sample).filter(k => !EXCLUDE.has(k) && SRC.test(k));
  const ga4State = ga4.length > 0 && ga4SourceKeys.length > 0 ? "green" : "amber";
  const mGa4 = MATURITY[ga4State];

  return (
    <EvidenceCard sources={["connectif","ga4"]}
      question="¿Cuánto revenue es no atribuido y de dónde viene?"
      kpis={hasData ? [
        { value: `${last.pct.toFixed(0)}%`, label: "Compras sin atribuir" },
        { value: fmtNumber(last["No atribuido"]), label: "Compras no atribuidas" },
        { value: fmtNumber(last.Atribuido), label: "Compras atribuidas" },
      ] : undefined}
      answer={!hasData ? "Sin datos" : undefined}
      maturity="green"
      insight="Connectif mide el hueco (total − Σ atribuido); GA4 aporta la explicación (orgánico / directo / paid / referral)."
      actions={[
        { verb: "investigar", rationale: "Un no atribuido alto sugiere instrumentar mejor el tracking o que el peso orgánico/directo es grande (bueno si es marca fuerte)." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Compras", b: "% sin atribuir" }}
      note="Principal: Connectif · daily_revenue. Explicativa: GA4 · ga4_daily (desglose de fuentes). Vista '% sin atribuir' = proporción de compras no atribuidas en el tiempo (¿mejora la atribución?)."
    >
      {hasData && (
        <div className={CHART_H}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top:5, right:8, left:4, bottom:0 }}>
              <CartesianGrid {...GRID} />
              <XAxis dataKey="name" {...AXIS} interval={Math.max(1,Math.floor(rows.length/8))} />
              <YAxis {...AXIS} />
              <Tooltip formatter={(v,n)=>[Math.round(v),n]} {...TIP} />
              <Legend {...LEGEND} />
              <Area type="monotone" dataKey="Atribuido" stackId="1" stroke={SERIES[0]} fill={SERIES[0]} fillOpacity={STACK_FILL_OPACITY} />
              <Area type="monotone" dataKey="No atribuido" stackId="1" stroke={SERIES[4]} fill={SERIES[4]} fillOpacity={STACK_FILL_OPACITY} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="mt-2 flex items-center gap-2">
        <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${mGa4.cls}`}>{mGa4.symbol} GA4</span>
        <span className="text-[10px] text-muted-foreground">
          {ga4State === "green" ? "Desglose de fuentes GA4 disponible." : "Desglose por fuente (orgánico/directo/paid) se activa cuando GA4 lo incluya."}
        </span>
      </div>
    </EvidenceCard>
  );
}
