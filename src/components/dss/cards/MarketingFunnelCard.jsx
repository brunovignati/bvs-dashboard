import EvidenceCard from "../EvidenceCard";
import { MATURITY, upToCutoff } from "@/lib/dss/dssUtils";
import { CHART } from "@/lib/dss/palette";
import { useIgDaily, useFbDaily, useTkDaily, useGa4Daily, useDailyRevenue } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, fmtCurrency } from "@/lib/dashboardData";
import { ChevronDown } from "lucide-react";

const EXCLUDE = new Set(["date_str","year","month","day","updated_at","created_at","id"]);
const PREF = ["sessions","users","total_users","totalUsers","active_users","activeUsers","page_views","pageviews","screen_page_views","screenPageViews","engaged_sessions"];

function Stage({ label, source, value, srcState, color }) {
  const m = MATURITY[srcState] || MATURITY.amber;
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label} · <span className="font-semibold">{source}</span></p>
            <p className="text-xl font-bold font-heading text-foreground">{value}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full border ${m.cls} whitespace-nowrap`}>
          {m.symbol} {m.label}
        </span>
      </div>
    </div>
  );
}

export default function MarketingFunnelCard({ delay }) {
  const { data: igRaw = [] } = useIgDaily();
  const { data: fbRaw = [] } = useFbDaily();
  const { data: tkRaw = [] } = useTkDaily();
  const { data: ga4Raw = [] } = useGa4Daily();
  const { data: revRaw = [] } = useDailyRevenue();
  const { rangeB } = useComparison();
  // El comparador controla la ventana: hasta el final del período principal.
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const ig = upToCutoff(igRaw, cutoff);
  const fb = upToCutoff(fbRaw, cutoff);
  const tk = upToCutoff(tkRaw, cutoff);
  const ga4 = upToCutoff(ga4Raw, cutoff);
  const rev = upToCutoff(revRaw, cutoff);

  const followers = [ig, fb, tk].reduce((s, arr) => s + (Number(arr[arr.length-1]?.followers) || 0), 0);
  const socialState = (ig.length + fb.length + tk.length) > 0 ? "green" : "amber";

  const sample = ga4[ga4.length-1] || {};
  const gKeys = Object.keys(sample).filter(k => !EXCLUDE.has(k) && typeof sample[k] === "number");
  const gMetric = PREF.find(p => gKeys.includes(p)) || gKeys[0];
  const traffic = gMetric ? ga4.slice(-30).reduce((s,r)=>s+(Number(r[gMetric])||0),0) : 0;
  const trafficState = ga4.length > 0 && gMetric ? "green" : "amber";
  const trafficLabel = gMetric ? gMetric.replace(/_/g," ") : "tráfico";

  const sorted = [...rev].sort((a,b)=>a.year!==b.year?a.year-b.year:a.month!==b.month?a.month-b.month:(a.day||0)-(b.day||0));
  const last30 = sorted.slice(-30);
  const purchases = last30.reduce((s,r)=>s+(r.purchases||0),0);
  const revenue = last30.reduce((s,r)=>s+(r.revenue||0),0);
  const connState = rev.length > 0 ? "green" : "amber";

  return (
    <EvidenceCard
      question="¿Está funcionando el marketing? (embudo completo)"
      answer={`${fmtCurrency(revenue)} · ${fmtNumber(purchases)} compras (30d)`}
      answerTone="neutral"
      context="Una sola narrativa de punta a punta: notoriedad (Metricool) → tráfico y comportamiento (GA4) → conversión y revenue (Connectif)."
      maturity="green"
      actions={[
        { verb: "investigar", rationale: "Localiza dónde se rompe el embudo: mucha audiencia y poco tráfico = problema de contenido; mucho tráfico y poca compra = problema de conversión on-site." },
        { verb: "escalar", rationale: "Refuerza el tramo que mejor convierte al siguiente." },
      ]}
      delay={delay}
      note="Embudo multifuente. Cada tramo indica su fuente y su estado de dato; los tramos con ◐ se activan al acumular histórico."
    >
      <div className="space-y-1.5">
        <Stage label="1 · Notoriedad" source="Metricool" value={socialState==="green"?`${fmtNumber(followers)} seguidores`:"pendiente de datos"} srcState={socialState} color={CHART.accent} />
        <div className="flex justify-center"><ChevronDown className="w-4 h-4 text-muted-foreground" /></div>
        <Stage label={`2 · Tráfico (${trafficLabel})`} source="GA4" value={trafficState==="green"?`${fmtNumber(traffic)} / 30d`:"pendiente de datos"} srcState={trafficState} color={CHART.warning} />
        <div className="flex justify-center"><ChevronDown className="w-4 h-4 text-muted-foreground" /></div>
        <Stage label="3 · Conversión" source="Connectif" value={connState==="green"?`${fmtNumber(purchases)} compras`:"pendiente de datos"} srcState={connState} color={CHART.primary} />
        <div className="flex justify-center"><ChevronDown className="w-4 h-4 text-muted-foreground" /></div>
        <Stage label="4 · Revenue" source="Connectif" value={connState==="green"?fmtCurrency(revenue):"pendiente de datos"} srcState={connState} color={CHART.positive} />
      </div>
    </EvidenceCard>
  );
}
