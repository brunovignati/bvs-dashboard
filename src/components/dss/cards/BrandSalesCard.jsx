/**
 * BrandSalesCard (Growth · Revenue) — Ventas por MARCA real (fabricante), origen GA4.
 * GA4 registra cada compra a nivel de artículo con su item_brand → aquí se agrega por marca
 * en el periodo seleccionado y se ordena por revenue. Es la única fuente que hoy da el
 * consumo por marca real (Connectif solo conoce "BVS Vet Shop"). Respeta el selector.
 * Matiz: GA4 mide la web (online, sujeto a consentimiento); direccional, no exacto contable.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useBrandSales } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";

// Marcas "no informativas" que no aportan a un ranking de fabricante.
const NOISE = new Set(["(sin marca)", "(not set)", "(not provided)", ""]);

export default function BrandSalesCard({ delay }) {
  const { data: raw = [] } = useBrandSales();
  const { rangeB, inRange, labelRange } = useComparison();

  const agg = {};
  for (const r of raw) {
    if (!inRange(rangeB, r)) continue;
    const brand = (r.brand || "").trim();
    const a = (agg[brand] ||= { brand, revenue: 0, units: 0 });
    a.revenue += Number(r.revenue) || 0;
    a.units += Number(r.units) || 0;
  }
  const all = Object.values(agg).filter((b) => b.revenue > 0 || b.units > 0);
  const totalRev = all.reduce((s, b) => s + b.revenue, 0);

  const ranked = all
    .filter((b) => !NOISE.has(b.brand))
    .sort((a, b) => b.revenue - a.revenue || b.units - a.units)
    .slice(0, 12)
    .map((b) => ({
      name: b.brand.length > 22 ? b.brand.slice(0, 21) + "…" : b.brand,
      full: b.brand,
      revenue: b.revenue,
      units: b.units,
      share: totalRev > 0 ? (b.revenue / totalRev) * 100 : 0,
    }));

  const hasData = ranked.length >= 1;
  const top = hasData ? ranked[0] : null;
  const cmp = labelRange(rangeB);

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
        ? `En ${cmp}, ${top.full} lidera con el ${top.share.toFixed(0)}% del revenue medido por GA4. Ranking por ingresos de artículo; unidades en el tooltip.`
        : "Aún no hay datos de ventas por marca para el período seleccionado (se pueblan desde GA4)."}
      actions={[
        { verb: "escalar", rationale: top ? `Refuerza surtido y promoción de las marcas que más pesan (empezando por ${top.full}).` : "Prioriza las marcas con mayor venta comprobada." },
        { verb: "vigilar", rationale: "Compara el peso de cada marca entre periodos para detectar las que ganan o pierden tracción." },
      ]}
      delay={delay}
      note="Fuente: Google Analytics 4 (dimensión item_brand · itemRevenue e itemsPurchased), agregado por marca y mes. Mide ventas de la web (online, sujeto a consentimiento/adblock): medida direccional del consumo por marca, no cifra contable exacta. El total exacto + retail llegará vía PrestaShop cuando haya acceso."
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
