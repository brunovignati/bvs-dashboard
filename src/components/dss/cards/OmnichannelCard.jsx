import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useChannelSegmentation } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Partición MECE del comprador por ORIGEN de la compra (suma 100% del total del mes):
//   Online (web) · Retail (tienda física, vía API) · Omnicanal (combina ambos).
// NO se usan api_buyers/web_buyers crudos: solapan (un omnicanal cuenta en los dos) y
// producen doble conteo. digital/retail/omnichannel ya vienen desagregados sin solape.
const KEYS = [
  { k: "digital", label: "Online" },
  { k: "retail", label: "Retail" },
  { k: "omnichannel", label: "Omnicanal" },
];
const COLORS = ["hsl(16,79%,57%)", "hsl(30,72%,66%)", "hsl(37,42%,74%)"];
// Umbral para considerar que un mes tiene el origen físico REALMENTE registrado
// (evita contar como "retail activo" el ruido de 1 comprador suelto).
const LIVE_THRESHOLD = 0.005; // 0,5% del total del mes en retail+omnicanal

const tot = (r) => (r.total_buyers ?? ((r.digital || 0) + (r.retail || 0) + (r.omnichannel || 0))) || 0;

export default function OmnichannelCard({ delay }) {
  const { data: rawAll = [] } = useChannelSegmentation();
  const { rangeB, sumRange, labelRange } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const monthly = rawAll
    .filter((r) => r.year * 12 + r.month <= cutoff)
    .map((r) => {
      const t = tot(r);
      return {
        k: r.year * 12 + r.month, year: r.year, month: r.month,
        digital: r.digital || 0, retail: r.retail || 0, omnichannel: r.omnichannel || 0,
        total: t, splitShare: t ? ((r.retail || 0) + (r.omnichannel || 0)) / t : 0,
      };
    })
    .sort((a, b) => a.k - b.k);

  const hasAny = monthly.length > 0;
  // Primer mes con origen físico realmente capturado (dinámico: se autodetecta).
  const liveMonth = monthly.find((m) => m.splitShare >= LIVE_THRESHOLD) || null;
  const liveLabel = liveMonth ? `${M[liveMonth.month]} ${liveMonth.year}` : null;

  // Composición del PERIODO seleccionado (respeta el selector).
  const digB = sumRange(rawAll, rangeB, "digital");
  const retB = sumRange(rawAll, rangeB, "retail");
  const omniB = sumRange(rawAll, rangeB, "omnichannel");
  const totB = digB + retB + omniB;
  const periodTracked = totB > 0 && (retB + omniB) / totB >= LIVE_THRESHOLD;
  const pct = (v) => (totB ? (v / totB) * 100 : 0);
  const parts = [
    { label: "Online", v: digB, pct: pct(digB), color: COLORS[0] },
    { label: "Retail", v: retB, pct: pct(retB), color: COLORS[1] },
    { label: "Omnicanal", v: omniB, pct: pct(omniB), color: COLORS[2] },
  ];
  const cmp = labelRange(rangeB);

  // Serie de evolución: SOLO desde que el origen físico se registra (evita la línea plana
  // engañosa de 100% online). Se enciende cuando haya ≥3 meses con registro real.
  const liveRows = liveMonth
    ? monthly.filter((m) => m.k >= liveMonth.k).map((m) => ({
        name: `${M[m.month]} ${String(m.year).slice(2)}`,
        Online: m.total ? (m.digital / m.total) * 100 : 0,
        Retail: m.total ? (m.retail / m.total) * 100 : 0,
        Omnicanal: m.total ? (m.omnichannel / m.total) * 100 : 0,
        Online__n: m.digital, Retail__n: m.retail, Omnicanal__n: m.omnichannel,
      }))
    : [];
  const showTrend = liveRows.length >= 3;

  // ── Estados ──────────────────────────────────────────────────────────
  if (!hasAny || totB === 0) {
    return (
      <EvidenceCard sources={["connectif"]}
        question="¿Cómo se reparte la venta por origen (online / retail / omnicanal)?"
        answer="Sin datos de origen en el período"
        answerTone="warn" maturity="amber" delay={delay}
        note="Fuente: Connectif · channel_segmentation. Origen = purchaseOrigin (Web = online, API = tienda física); omnicanal = clientes que combinan ambos."
      />
    );
  }

  const answer = periodTracked
    ? parts.map((p) => `${p.label} ${Math.round(p.pct)}%`).join(" · ")
    : "Solo origen online registrado en este período";

  return (
    <EvidenceCard sources={["connectif"]}
      question="¿Cómo se reparte la venta por origen (online / retail / omnicanal)?"
      answer={answer}
      answerTone={periodTracked ? "neutral" : "warn"}
      maturity={periodTracked ? "green" : "amber"}
      insight={periodTracked
        ? `En ${cmp}, de ${fmtNumber(totB)} compradores: ${Math.round(parts[0].pct)}% online, ${Math.round(parts[1].pct)}% en tienda física y ${Math.round(parts[2].pct)}% omnicanal. El origen físico se registra desde ${liveLabel}; los meses anteriores figuran como 100% online porque ese canal aún no se capturaba (no porque no hubiera ventas físicas).`
        : liveLabel
          ? `El período seleccionado es anterior a ${liveLabel}, cuando empezó a registrarse el origen físico/retail. Por eso figura como 100% online: es una brecha de registro, no ausencia de ventas físicas. Selecciona ${liveLabel} o posterior para ver el reparto real.`
          : `Hasta ahora solo se captura el origen online; el canal físico/retail aún no llega a Connectif. La serie madura cuando ese origen empiece a registrarse.`}
      actions={[
        { verb: "vigilar", rationale: "Sigue el peso de retail y omnicanal: el cliente que combina físico y digital suele valer más." },
        { verb: "investigar", rationale: "Confirma que el origen físico se captura de forma estable mes a mes antes de tomar decisiones sobre el reparto." },
      ]}
      delay={delay}
      note={`Fuente: Connectif · channel_segmentation. Origen = purchaseOrigin (Web = online, API = tienda física); omnicanal = clientes que combinan ambos. El origen físico se registra desde ${liveLabel || "una fecha aún no disponible"}; antes solo constaba online.`}
    >
      {/* Composición del período: barra de triple color (mismo estilo del dashboard) */}
      <div className="mb-1">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 mb-2 text-sm">
          {parts.map((p) => (
            <span key={p.label} className="flex items-baseline gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm self-center" style={{ background: p.color }} />
              <span className="font-semibold text-foreground">{p.label}</span>
              <span className="text-muted-foreground">{fmtNumber(p.v)} · {p.pct.toFixed(1)}%</span>
            </span>
          ))}
        </div>
        <div className="h-10 w-full rounded-lg overflow-hidden flex text-xs font-bold text-white">
          {parts.filter((p) => p.pct > 0).map((p) => (
            <div key={p.label} className="flex items-center justify-center" style={{ width: `${p.pct}%`, background: p.color }} title={`${p.label} ${p.pct.toFixed(1)}%`}>
              {p.pct >= 8 ? `${p.pct.toFixed(0)}%` : ""}
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5">Reparto de compradores por origen · {cmp}.</p>
      </div>

      {/* Evolución (solo desde que el origen físico se registra; ≥3 meses) */}
      {showTrend && (
        <div className="h-52 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={liveRows} stackOffset="expand" margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(liveRows.length / 8))} />
              <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip formatter={(v, n, p) => [`${(Number(v) * 100).toFixed(1)}% · ${fmtNumber(p?.payload?.[`${n}__n`] || 0)} compradores`, n]} labelStyle={{ fontSize: 11 }} />
              <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
              {KEYS.map((kk, i) => (
                <Bar key={kk.k} dataKey={kk.label} stackId="1" fill={COLORS[i]} maxBarSize={30} radius={i === KEYS.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
