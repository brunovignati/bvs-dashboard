import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSegments } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber, monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Layers, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

function TrendIcon({ delta }) {
  if (delta === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (delta > 0)  return <TrendingUp   className="w-3 h-3 text-blue-500" />;
  if (delta < 0)  return <TrendingDown className="w-3 h-3 text-slate-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

const SEGMENT_COLORS = [
  'hsl(199,89%,48%)',
  'hsl(199,80%,64%)',
  'hsl(199,80%,64%)',
  'hsl(199,60%,78%)',
  'hsl(200,90%,38%)',
];

export default function SegmentExplorer() {
  const { data: segments = [] } = useSegments();
  const { filterByPeriod } = useComparison();

  const periodSegments = filterByPeriod(segments);

  // Todos los meses disponibles en el rango
  const allMonthKeys = [...new Set(
    periodSegments.map(s => `${s.year}-${String(s.month).padStart(2,'0')}`)
  )].sort();

  // Si el rango no tiene datos, mostrar todos los meses disponibles
  const allKeys = [...new Set(
    segments.map(s => `${s.year}-${String(s.month).padStart(2,'0')}`)
  )].sort();
  const monthKeys = allMonthKeys.length >= 1 ? allMonthKeys : allKeys;

  const latestKey = monthKeys[monthKeys.length - 1];
  const prevKey   = monthKeys[monthKeys.length - 2];

  // Agrupar por segmento (solo datos del rango seleccionado)
  const bySegment = {};
  for (const s of periodSegments.length > 0 ? periodSegments : segments) {
    const key = `${s.year}-${String(s.month).padStart(2,'0')}`;
    if (!bySegment[s.segment]) bySegment[s.segment] = {};
    bySegment[s.segment][key] = s.contacts || 0;
  }

  // Snapshot del último mes en rango
  const latestSnapMap = {};
  for (const [seg, hist] of Object.entries(bySegment)) {
    latestSnapMap[seg] = hist[latestKey] ?? 0;
  }

  // Top 15 por tamaño actual
  const top15 = Object.entries(latestSnapMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  // Top 5 para el gráfico de evolución
  const top5 = top15.slice(0, 5);

  // Construir datos para LineChart (top 5 segmentos × meses en rango)
  const evolutionData = monthKeys.map(ym => {
    const [y, m] = ym.split('-').map(Number);
    const point  = { name: `${monthLabel(m)} ${String(y).slice(2)}` };
    top5.forEach(([seg]) => {
      point[seg] = bySegment[seg]?.[ym] ?? null;
    });
    return point;
  });

  const maxContacts = top15[0]?.[1] || 1;
  const hasTimeSeries = monthKeys.length >= 2;

  const enriched = top15.map(([seg, contacts], i) => {
    const history  = bySegment[seg] || {};
    const prevVal  = prevKey ? (history[prevKey] ?? null) : null;
    const delta    = prevVal !== null ? contacts - prevVal : null;
    const deltaPct = prevVal && prevVal > 0 ? ((delta / prevVal) * 100).toFixed(1) : null;
    const color    = SEGMENT_COLORS[i % SEGMENT_COLORS.length] ||
      `hsl(${217 + i * 10},${Math.max(40, 91 - i*4)}%,${Math.min(70, 50 + i*2)}%)`;
    return { seg, contacts, delta, deltaPct, color };
  });

  const totalContacts = top15.reduce((s, [, c]) => s + c, 0);
  const growing   = enriched.filter(e => e.delta !== null && e.delta > 0).length;
  const shrinking = enriched.filter(e => e.delta !== null && e.delta < 0).length;

  const { periodStart, periodEnd } = useComparison();
  const rangeLabel = periodStart.year === periodEnd.year && periodStart.month === periodEnd.month
    ? `${monthLabel(periodStart.month)} ${periodStart.year}`
    : `${monthLabel(periodStart.month)} ${periodStart.year} – ${monthLabel(periodEnd.month)} ${periodEnd.year}`;

  const latestMonth = latestKey
    ? (() => { const [y, m] = latestKey.split('-').map(Number); return `${monthLabel(m)} ${y}`; })()
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Segmentos de Audiencia"
        subtitle={`${Object.keys(bySegment).length} segmentos · ${rangeLabel} · ${monthKeys.length} snapshot${monthKeys.length !== 1 ? 's' : ''} · últimos datos: ${latestMonth}`}
        icon={Layers}
        badge="Segmentos"
      />

      {/* KPIs */}
      {hasTimeSeries && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Contactos (top 15)</p>
            <p className="text-lg font-bold font-heading">{fmtNumber(totalContacts)}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Creciendo</p>
            <p className="text-lg font-bold font-heading text-blue-500">{growing}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Decreciendo</p>
            <p className="text-lg font-bold font-heading text-slate-500">{shrinking}</p>
          </div>
        </div>
      )}

      {/* ── Gráfico de evolución (top 5 segmentos) ── */}
      {hasTimeSeries && evolutionData.length >= 2 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Evolución top 5 segmentos · {rangeLabel}
          </p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,13%,91%)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                  interval={Math.max(0, Math.floor(evolutionData.length / 8))} />
                <YAxis tick={{ fontSize: 9, fill: 'hsl(220,10%,50%)' }} axisLine={false} tickLine={false}
                  tickFormatter={v => `${(v/1000).toFixed(0)}K`} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-card/95 backdrop-blur border border-border rounded-xl p-3 shadow-xl max-w-56">
                        <p className="text-xs font-semibold mb-1.5">{label}</p>
                        {payload.filter(p => p.value !== null).map((p, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                            <span className="text-muted-foreground truncate max-w-28" title={p.dataKey}>{p.dataKey}:</span>
                            <span className="font-mono font-medium">{fmtNumber(p.value)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 9 }}
                  formatter={(v) => <span title={v} className="truncate" style={{ maxWidth: 120, display: 'inline-block', verticalAlign: 'middle' }}>{v.length > 18 ? v.slice(0, 16) + '…' : v}</span>}
                />
                {top5.map(([seg], i) => (
                  <Line
                    key={seg}
                    type="monotone"
                    dataKey={seg}
                    stroke={SEGMENT_COLORS[i % SEGMENT_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Lista de todos los segmentos ── */}
      {top15.length === 0 ? (
        <p className="text-muted-foreground text-sm">Cargando datos...</p>
      ) : (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Todos los segmentos · {latestMonth}
          </p>
          {enriched.map((e, i) => {
            const pct = (e.contacts / maxContacts) * 100;
            return (
              <div key={i}>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium truncate flex-1 min-w-0" title={e.seg}>{e.seg}</span>
                  {hasTimeSeries && e.delta !== null && (
                    <div className="flex items-center gap-0.5 shrink-0 w-16 justify-end">
                      <TrendIcon delta={e.delta} />
                      <span className={`text-[10px] font-mono ${
                        e.delta > 0 ? 'text-blue-500' : e.delta < 0 ? 'text-slate-500' : 'text-muted-foreground'
                      }`}>
                        {e.delta > 0 ? '+' : ''}{e.deltaPct}%
                      </span>
                    </div>
                  )}
                  <span className="text-xs font-mono text-muted-foreground shrink-0 w-16 text-right">
                    {fmtNumber(e.contacts)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.03 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: e.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!hasTimeSeries && segments.length > 0 && (
        <div className="mt-4">
          <InsightCard
            type="info"
            title="Serie temporal en construcción"
            description="El dashboard acumula un snapshot mensual por cada sync nocturno. En 1–2 meses aparecerán la evolución multi-línea y los deltas MoM para cada segmento."
          />
        </div>
      )}

      {hasTimeSeries && (
        <div className="mt-4">
          <InsightCard
            type={growing > shrinking ? "success" : "warning"}
            title="Evolución de Segmentos"
            description={`${growing} segmentos crecieron y ${shrinking} decrecieron respecto al mes anterior en el período ${rangeLabel}. El gráfico muestra la evolución de los 5 segmentos más grandes.`}
          />
        </div>
      )}
    </motion.div>
  );
}
