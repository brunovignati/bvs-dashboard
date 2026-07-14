import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useDailySticky } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const EVO_COLORS = ["hsl(16,79%,57%)", "hsl(45,35%,46%)", "hsl(186,32%,42%)", "hsl(4,39%,55%)", "hsl(30,72%,66%)"];
const shortLabel = (n) => (n && n.length > 18 ? n.slice(0, 17) + "…" : n);

export default function WebStickyCard({ delay }) {
  // Desde el dato DIARIO (daily_sticky) con nombre de pieza + fecha → así el ranking
  // respeta el periodo del selector (antes usaba la tabla `sticky` acumulada sin fecha).
  const { data = [] } = useDailySticky();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const agg = {};
  for (const r of data) {
    if ((r.year * 12 + r.month) > cutoff) continue;
    const name = r.contentName || r.content_name;
    if (!name) continue;
    const a = (agg[name] ||= { name, opens: 0, clicks: 0, buyers: 0, revenue: 0 });
    a.opens += r.opens || 0; a.clicks += r.clicks || 0; a.buyers += r.buyers || 0; a.revenue += r.revenue || 0;
  }
  const rows = Object.values(agg)
    .map(s => ({
      name: s.name.length > 26 ? s.name.slice(0, 25) + "…" : s.name, full: s.name,
      revenue: s.revenue, conv: s.opens > 0 ? (s.buyers / s.opens) * 100 : 0, inactive: (s.buyers || 0) === 0,
    }))
    .sort((a, b) => (b.conv - a.conv) || (b.revenue - a.revenue))
    .slice(0, 8);
  const hasData = rows.length >= 2;
  const active = rows.filter(r => !r.inactive);
  const best = active[0];

  // ── Vista B — evolución mensual del revenue de las piezas top (por revenue), últimos
  // 12 meses hasta el corte del selector. Mismo dato (daily_sticky) y mismo cutoff. ──
  const topRev = Object.values(agg).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  const topNames = topRev.map(p => p.name);
  const labelByName = {}; topRev.forEach(p => { labelByName[p.name] = shortLabel(p.name); });
  const byM = {};
  for (const r of data) {
    const k = r.year * 12 + r.month;
    if (k > cutoff) continue;
    const name = r.contentName || r.content_name;
    if (!topNames.includes(name)) continue;
    (byM[k] ||= { k, year: r.year, month: r.month });
    byM[k][name] = (byM[k][name] || 0) + (r.revenue || 0);
  }
  const evo = Object.values(byM).sort((a, b) => a.k - b.k).slice(-12)
    .map(m => { const o = { name: `${M[m.month]} ${String(m.year).slice(2)}` }; topNames.forEach(n => { o[labelByName[n]] = m[n] || 0; }); return o; });
  const hasEvo = evo.length >= 2 && topNames.length >= 1;

  const altView = hasEvo ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9 }} />
          {topRev.map((p, i) => <Line key={p.name} type="monotone" dataKey={labelByName[p.name]} stroke={EVO_COLORS[i % EVO_COLORS.length]} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Convierte el contenido web / sticky? (captación)"
      answer={hasData ? (best ? `Top: ${best.name}` : "Sin piezas activas") : "Sin datos en el período"}
      answerTone={hasData && best ? "good" : "warn"}
      context={hasData ? `Ordenado por conversión (compradores/aperturas). ${active.length}/${rows.length} piezas convierten > 0 en el período; el resto, candidatas a retirar.` : undefined}
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: best ? `Mayor eficiencia de conversión: "${best.name}". Replícala.` : "Prioriza las piezas con conversión probada." },
        { verb: "detener", rationale: "Retira los sticky con conversión 0 sostenida (ocupan espacio sin captar)." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Ranking", b: "Evolución" }}
      note="Fuente: Connectif · daily_sticky (por pieza y día → respeta el periodo). Conversión = compradores / aperturas de la pieza; revenue en el tooltip. Vista 'Evolución' = revenue mensual de las 5 piezas top, últimos 12 meses hasta el fin del periodo."
    >
      {hasData && (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} layout="vertical" margin={{ top:4, right:16, left:4, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize:8, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`${v.toFixed(1)}%`} />
              <YAxis type="category" dataKey="name" width={140} tick={{ fontSize:8, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v,n,p)=>[`${Number(v).toFixed(2)}% · ${fmtCurrency(p?.payload?.revenue||0)}`,"Conversión · Revenue"]} labelFormatter={(l,p)=>p?.[0]?.payload?.full||l} labelStyle={{ fontSize:10 }} />
              <Bar dataKey="conv" radius={[0,4,4,0]}>
                {rows.map((r,i)=><Cell key={i} fill={r.inactive?"hsl(220,13%,70%)":i===0?"hsl(30,72%,66%)":"hsl(16,79%,57%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
