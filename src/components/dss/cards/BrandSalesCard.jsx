/**
 * BrandSalesCard (Growth · Revenue) — Ventas por MARCA real (fabricante), origen GA4.
 * GA4 registra cada compra a nivel de artículo con su item_brand → aquí se agrega por marca
 * en el periodo seleccionado y se ordena por revenue. Es la única fuente que hoy da el
 * consumo por marca real (Connectif solo conoce "BVS Vet Shop"). Respeta el selector.
 * Matiz: GA4 mide la web (online, sujeto a consentimiento); direccional, no exacto contable.
 */
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useBrandSales } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

const M = ["", "Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const EVO_COLORS = ["hsl(16,79%,57%)", "hsl(45,35%,46%)", "hsl(186,32%,42%)", "hsl(4,39%,55%)", "hsl(30,72%,66%)"];

// Marca de la casa / genérico (no es fabricante) + valores vacíos: fuera del ranking de
// marcas. Se comparan por su forma normalizada (mayúsculas, sin acentos/comillas).
const HOUSE = new Set(["BARAKALDO VET", "BVS VET SHOP", "(SIN MARCA)", "(NOT SET)", "(NOT PROVIDED)", ""]);

// Clave de unificación: GA4 trae la misma marca escrita de varias formas
// (Elanco/ELANCO, Bioiberica/BIOIBERICA, Hill´s/Hill's…). Normalizamos para no fragmentar.
const canonKey = (b) =>
  (b || "").toUpperCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // quita acentos
    .replace(/[´`'’]/g, "'")                    // unifica comillas/tildes
    .replace(/\s+/g, " ")
    .trim();

// Nombre a mostrar: entre las variantes de una misma marca, preferimos la que NO va toda en
// mayúsculas (Elanco mejor que ELANCO); a igualdad, la más larga.
const betterDisplay = (a, b) => {
  const aUp = a === a.toUpperCase(), bUp = b === b.toUpperCase();
  if (aUp !== bUp) return aUp ? b : a;
  return b.length > a.length ? b : a;
};

export default function BrandSalesCard({ delay }) {
  const { data: raw = [] } = useBrandSales();
  const { rangeB, inRange, labelRange } = useComparison();

  const agg = {};
  for (const r of raw) {
    if (!inRange(rangeB, r)) continue;
    const key = canonKey(r.brand);
    if (HOUSE.has(key)) continue;                       // fuera marca propia/genérico
    const a = (agg[key] ||= { key, display: (r.brand || "").trim(), revenue: 0, units: 0 });
    a.display = betterDisplay(a.display, (r.brand || "").trim());
    a.revenue += Number(r.revenue) || 0;
    a.units += Number(r.units) || 0;
  }
  const all = Object.values(agg).filter((b) => b.revenue > 0 || b.units > 0);
  const totalRev = all.reduce((s, b) => s + b.revenue, 0);

  const ranked = all
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
    .slice(0, 12)
    .map((b) => ({
      name: b.display.length > 22 ? b.display.slice(0, 21) + "…" : b.display,
      full: b.display,
      revenue: b.revenue,
      units: b.units,
      share: totalRev > 0 ? (b.revenue / totalRev) * 100 : 0,
    }));

  const hasData = ranked.length >= 1;
  const top = hasData ? ranked[0] : null;
  const cmp = labelRange(rangeB);

  // ── Vista B — evolución mensual de las top-5 marcas (últimos 12 meses hasta el corte
  // del selector). Misma fuente y mismo cutoff que la vista A → atada al periodo. ──
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;
  const topFive = ranked.slice(0, 5);
  const topKeys = topFive.map((b) => canonKey(b.full));
  const dispByKey = {}; topFive.forEach((b) => { dispByKey[canonKey(b.full)] = b.full; });
  const byMonth = {};
  for (const r of raw) {
    const k = r.year * 12 + r.month;
    if (k > cutoff) continue;
    const ck = canonKey(r.brand);
    if (!topKeys.includes(ck)) continue;
    (byMonth[k] ||= { k, year: r.year, month: r.month });
    byMonth[k][ck] = (byMonth[k][ck] || 0) + (Number(r.revenue) || 0);
  }
  const evo = Object.values(byMonth).sort((a, b) => a.k - b.k).slice(-12)
    .map((m) => { const o = { name: `${M[m.month]} ${String(m.year).slice(2)}` }; topKeys.forEach((ck) => { o[dispByKey[ck]] = m[ck] || 0; }); return o; });
  const hasEvo = evo.length >= 2 && topFive.length >= 1;

  const altView = hasEvo ? (
    <div style={{ height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={evo} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(evo.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
          <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} labelStyle={{ fontSize: 10 }} />
          <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
          {topFive.map((b, i) => <Line key={b.full} type="monotone" dataKey={b.full} stroke={EVO_COLORS[i % EVO_COLORS.length]} strokeWidth={2} dot={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  ) : undefined;

  return (
    <EvidenceCard sources={["ga4"]}
      question="¿Qué marcas venden más? (consumo por marca)"
      kpis={hasData ? [
        { value: top.full, label: "Marca líder" },
        { value: `${top.share.toFixed(0)}%`, label: "de las ventas medidas" },
        { value: fmtNumber(ranked.length), label: "marcas con venta" },
      ] : undefined}
      answer={!hasData ? "Sin datos de marca en el período" : undefined}
      answerTone={hasData ? "neutral" : "warn"}
      maturity={hasData ? "green" : "amber"}
      insight={hasData
        ? `En ${cmp}, ${top.full} lidera con el ${top.share.toFixed(0)}% del revenue por fabricante medido por GA4. Ranking por ingresos de artículo; unidades en el tooltip. Excluye la marca propia (Barakaldo Vet / BVS Vet Shop) y agrupa variantes de la misma marca.`
        : "Aún no hay datos de ventas por marca para el período seleccionado (se pueblan desde GA4)."}
      actions={[
        { verb: "escalar", rationale: top ? `Refuerza surtido y promoción de las marcas que más pesan (empezando por ${top.full}).` : "Prioriza las marcas con mayor venta comprobada." },
        { verb: "vigilar", rationale: "Compara el peso de cada marca entre periodos para detectar las que ganan o pierden tracción." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Ranking", b: "Evolución" }}
      note="Fuente: Google Analytics 4 (dimensión item_brand · itemRevenue e itemsPurchased), agregado por marca y mes. Mide ventas de la web (online, sujeto a consentimiento/adblock): medida direccional del consumo por marca, no cifra contable exacta. El total exacto + retail llegará vía PrestaShop cuando haya acceso. Vista 'Evolución' = revenue mensual de las 5 marcas líderes, últimos 12 meses hasta el fin del periodo."
    >
      {hasData && (
        <div style={{ height: Math.max(180, ranked.length * 26 + 30) }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ranked} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
              <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v, n, p) => [`${fmtCurrency(v)} · ${fmtNumber(p?.payload?.units || 0)} uds · ${(p?.payload?.share || 0).toFixed(1)}%`, "Revenue · Unidades · Cuota"]} labelFormatter={(l, p) => p?.[0]?.payload?.full || l} labelStyle={{ fontSize: 10 }} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                {ranked.map((r, i) => <Cell key={i} fill={i === 0 ? "hsl(30,72%,66%)" : "hsl(16,79%,57%)"} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </EvidenceCard>
  );
}
