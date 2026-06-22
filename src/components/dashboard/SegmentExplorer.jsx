import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import { useSegments } from "@/lib/useEntities";
import { fmtNumber, monthLabel } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Layers, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { motion } from "framer-motion";

// Sparkline minimalista para series de segmento
function Sparkline({ data, color }) {
  if (!data || data.length < 2) return null;
  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <Line type="monotone" dataKey="contacts" stroke={color} strokeWidth={1.5}
            dot={false} isAnimationActive={false} />
          <Tooltip
            content={({ active, payload, label }) =>
              active && payload?.length ? (
                <div className="bg-card border border-border rounded px-2 py-1 text-[9px] shadow">
                  {label}: {fmtNumber(payload[0].value)}
                </div>
              ) : null
            }
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendIcon({ delta }) {
  if (delta === null) return <Minus className="w-3 h-3 text-muted-foreground" />;
  if (delta > 0)  return <TrendingUp   className="w-3 h-3 text-emerald-500" />;
  if (delta < 0)  return <TrendingDown className="w-3 h-3 text-red-500" />;
  return <Minus className="w-3 h-3 text-muted-foreground" />;
}

export default function SegmentExplorer() {
  const { data: segments = [] } = useSegments();

  // Detectar cuántos meses distintos hay
  const monthKeys = [...new Set(
    segments.map(s => `${s.year}-${String(s.month).padStart(2,'0')}`)
  )].sort();
  const hasTimeSeries = monthKeys.length >= 2;
  const latestKey = monthKeys[monthKeys.length - 1];

  // Si hay serie temporal: agrupar por segmento y construir historial
  const bySegment = {};
  for (const s of segments) {
    const key = `${s.year}-${String(s.month).padStart(2,'0')}`;
    if (!bySegment[s.segment]) bySegment[s.segment] = {};
    bySegment[s.segment][key] = s.contacts || 0;
  }

  // Snapshot del último mes
  const latestSnapMap = {};
  for (const s of segments) {
    const key = `${s.year}-${String(s.month).padStart(2,'0')}`;
    if (key === latestKey) latestSnapMap[s.segment] = s.contacts || 0;
  }

  // Top 15 por tamaño actual
  const top15 = Object.entries(latestSnapMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 15);

  const maxContacts = top15[0]?.[1] || 1;

  // Para cada segmento: sparkline data + delta MoM
  const enriched = top15.map(([seg, contacts], i) => {
    const history = bySegment[seg] || {};
    const sparkData = monthKeys.map(k => ({
      name:     k,
      contacts: history[k] ?? null,
    })).filter(d => d.contacts !== null);

    const prevKey   = monthKeys[monthKeys.length - 2];
    const prevVal   = prevKey ? (history[prevKey] ?? null) : null;
    const delta     = prevVal !== null ? contacts - prevVal : null;
    const deltaPct  = prevVal && prevVal > 0 ? ((delta / prevVal) * 100).toFixed(1) : null;

    const hue   = 217 + i * 8;
    const sat   = Math.max(40, 91 - i * 4);
    const light = Math.min(70, 50 + i * 2);
    const color = `hsl(${hue},${sat}%,${light}%)`;

    return { seg, contacts, sparkData, delta, deltaPct, color };
  });

  // KPIs globales
  const totalContacts = top15.reduce((s, [, c]) => s + c, 0);
  const growing = enriched.filter(e => e.delta !== null && e.delta > 0).length;
  const shrinking = enriched.filter(e => e.delta !== null && e.delta < 0).length;

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
        subtitle={`${fmtNumber(segments.length > 0 ? Object.keys(bySegment).length : 0)} segmentos · ${monthKeys.length} snapshot${monthKeys.length !== 1 ? 's' : ''} · ${latestMonth}`}
        icon={Layers}
        badge="Segmentos"
      />

      {/* KPIs globales (solo si hay serie temporal) */}
      {hasTimeSeries && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Contactos (top 15)</p>
            <p className="text-lg font-bold font-heading">{fmtNumber(totalContacts)}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Creciendo</p>
            <p className="text-lg font-bold font-heading text-emerald-500">{growing}</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Decreciendo</p>
            <p className="text-lg font-bold font-heading text-red-500">{shrinking}</p>
          </div>
        </div>
      )}

      {top15.length === 0 ? (
        <p className="text-muted-foreground text-sm">Cargando datos...</p>
      ) : (
        <div className="space-y-2">
          {enriched.map((e, i) => {
            const pct = (e.contacts / maxContacts) * 100;
            return (
              <div key={i} className="group">
                <div className="flex items-center gap-2 mb-0.5">
                  {/* Nombre */}
                  <span className="text-xs font-medium truncate flex-1 min-w-0" title={e.seg}>
                    {e.seg}
                  </span>
                  {/* Sparkline (solo si hay serie) */}
                  {hasTimeSeries && <Sparkline data={e.sparkData} color={e.color} />}
                  {/* Delta MoM */}
                  {hasTimeSeries && e.delta !== null && (
                    <div className="flex items-center gap-0.5 shrink-0 w-16 justify-end">
                      <TrendIcon delta={e.delta} />
                      <span className={`text-[10px] font-mono ${
                        e.delta > 0 ? 'text-emerald-500' : e.delta < 0 ? 'text-red-500' : 'text-muted-foreground'
                      }`}>
                        {e.delta > 0 ? '+' : ''}{e.deltaPct}%
                      </span>
                    </div>
                  )}
                  {/* Contactos */}
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
            description="El dashboard acumula un snapshot mensual por cada sync nocturno. En 1–2 meses aparecerán sparklines y deltas MoM para cada segmento."
          />
        </div>
      )}

      {hasTimeSeries && (
        <div className="mt-4">
          <InsightCard
            type={growing > shrinking ? "success" : "warning"}
            title="Evolución de Segmentos"
            description={`${growing} segmentos crecieron y ${shrinking} decreció respecto al mes anterior. Monitorea los segmentos de alto valor (VIP, compradores recientes) para detectar cambios tempranos en la base activa.`}
          />
        </div>
      )}
    </motion.div>
  );
}
