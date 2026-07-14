import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useEmailCampaigns, usePushCampaigns } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const EVO_COLORS = ["hsl(16,79%,57%)", "hsl(45,35%,46%)", "hsl(186,32%,42%)", "hsl(4,39%,55%)", "hsl(30,72%,66%)"];

// Temáticas de producto detectables en los nombres de campaña
const THEMES = [
  { label: "Alimentación", rx: /comida|aliment|pienso|royal\s*canin|food|snack/i },
  { label: "Antiparasitarios", rx: /antiparasit|seresto|advantix|nexgard|frontline|bravecto|pulga|garrapata|desparasit/i },
  { label: "Nutracéuticos / Salud", rx: /nutrac|suplement|articul|condro|calm|senil|vitamin|salud|omega/i },
  { label: "Higiene / Accesorios", rx: /higien|arena|shampoo|champ|accesor|juguet|cama|correa/i },
  { label: "Farmacia / Medicación", rx: /medicament|farmacia|receta|antibiot|otico|dermat/i },
];

function classify(name) {
  const s = String(name || "");
  for (const t of THEMES) if (t.rx.test(s)) return t.label;
  return null;
}

export default function ProductThemeCard({ delay }) {
  const { data: email = [] } = useEmailCampaigns();
  const { data: push = [] } = usePushCampaigns();
  const { rangeB } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const inPeriod = (r) => (r.year * 12 + r.month) <= cutoff;
  const all = [
    ...email.filter(inPeriod).map(r => ({ name: r.emailName || r.emailWorkflow, revenue: r.revenue || 0 })),
    ...push.filter(inPeriod).map(r => ({ name: r.workflow, revenue: r.revenue || 0 })),
  ];

  const acc = {};
  let matched = 0, totalRev = 0;
  for (const c of all) {
    totalRev += c.revenue;
    const th = classify(c.name);
    if (th) { acc[th] = (acc[th] || 0) + c.revenue; matched += c.revenue; }
  }
  const rows = Object.entries(acc).map(([label, revenue]) => ({ label, revenue }))
    .sort((a, b) => b.revenue - a.revenue);
  const hasData = rows.length >= 2;
  const top = rows[0];
  const coverage = totalRev > 0 ? (matched / totalRev) * 100 : 0;

  if (!hasData) {
    return (
      <EvidenceCard sources={["connectif"]} question="¿Qué temáticas de producto funcionan mejor? (inferido de nombres de campaña)" answer="Sin señal suficiente" answerTone="neutral"
        maturity="amber" delay={delay}
        note="No se detectan suficientes temáticas de producto en los nombres de campaña."
        actions={[{verb:"investigar", rationale:"Nomenclatura de campañas poco descriptiva: dificulta clasificar por producto."}]} />
    );
  }

  // ── Vista B — evolución mensual del revenue por temática (últimos 12 meses hasta el
  // corte). Reconstruye desde email/push con year/month, misma clasificación por nombre. ──
  const themeLabels = rows.slice(0, 5).map(r => r.label);
  const evoSrc = [
    ...email.filter(inPeriod).map(r => ({ y: r.year, m: r.month, name: r.emailName || r.emailWorkflow, revenue: r.revenue || 0 })),
    ...push.filter(inPeriod).map(r => ({ y: r.year, m: r.month, name: r.workflow, revenue: r.revenue || 0 })),
  ];
  const byM = {};
  for (const c of evoSrc) {
    const th = classify(c.name);
    if (!th || !themeLabels.includes(th)) continue;
    const k = c.y * 12 + c.m;
    (byM[k] ||= { k, year: c.y, month: c.m });
    byM[k][th] = (byM[k][th] || 0) + c.revenue;
  }
  const evo = Object.values(byM).sort((a, b) => a.k - b.k).slice(-12)
    .map(m => { const o = { name: `${M[m.month]} ${String(m.year).slice(2)}` }; themeLabels.forEach(t => { o[t] = m[t] || 0; }); return o; });
  const hasEvo = evo.length >= 2 && themeLabels.length >= 1;

  const altView = hasEvo ? (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => `€${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 9 }} />
          {themeLabels.map((t, i) => <Line key={t} type="monotone" dataKey={t} stroke={EVO_COLORS[i % EVO_COLORS.length]} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Qué temáticas de producto funcionan mejor? (inferido de nombres de campaña)"
      answer={top ? `${top.label}` : "—"}
      answerTone="good"
      context={`Temática líder por revenue de campaña. Clasificadas por nombre de campaña (${coverage.toFixed(0)}% del revenue de campañas identificado).`}
      maturity="amber"
      actions={[
        { verb: "escalar", rationale: top ? `Refuerza campañas de "${top.label}", la temática que más revenue mueve.` : "Prioriza la temática de mayor revenue." },
        { verb: "crear", rationale: "Desarrolla campañas para temáticas rentables poco explotadas." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Ranking", b: "Evolución" }}
      note="Proxy con datos existentes (email_campaigns + push_campaigns). Es revenue atribuido por temática de campaña, NO ventas totales por categoría (eso exigiría un export de ventas por categoría). Vista 'Evolución' = revenue mensual por temática, últimos 12 meses hasta el fin del periodo."
    >
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top:4, right:16, left:4, bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
            <XAxis type="number" tick={{ fontSize:8, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v=>`€${(v/1000).toFixed(0)}K`} />
            <YAxis type="category" dataKey="label" width={130} tick={{ fontSize:9, fill:"hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
            <Tooltip formatter={(v)=>[fmtCurrency(v),"Revenue"]} labelStyle={{ fontSize:10 }} />
            <Bar dataKey="revenue" radius={[0,4,4,0]}>
              {rows.map((_,i)=><Cell key={i} fill={i===0?"hsl(30,72%,66%)":"hsl(16,79%,57%)"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </EvidenceCard>
  );
}
