/**
 * CategoryMixCard (Producto) — mix de ventas por categoría, con dato REAL de catálogo por
 * venta (no inferido de nombres de campaña). Fuente: PrestaShop (Gestor SQL: order_detail →
 * producto → categoría principal depth-2) → Supabase (category_sales). Canal web.
 *
 * Vista A: reparto del ingreso por categoría en el periodo (mix).
 * Vista B: evolución mensual del ingreso por categoría (cómo cambia el mix en el tiempo).
 * Respeta el ComparisonContext (mismo periodo en ambas vistas).
 */
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCategorySales } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, fmtNumber, monthLabel } from "@/lib/dashboardData";

const COLORS = ["hsl(16,79%,57%)", "hsl(186,32%,42%)", "hsl(45,45%,50%)", "hsl(4,39%,55%)", "hsl(140,30%,45%)", "hsl(280,25%,55%)", "hsl(32,10%,60%)"];
// Nombres cortos para etiquetas
const SHORT = {
  "Productos para Perros": "Perros",
  "Tienda de Productos para Gatos": "Gatos",
  "Complementos Alimenticios y de Salud para Perros y Gatos": "Complementos/Salud",
  "Productos BVS Vet Shop": "General BVS",
  "Higiene y Peluquería": "Higiene",
  "Otros Animales": "Otros animales",
  "Ofertas": "Ofertas",
};
const short = (c) => SHORT[c] || c;

export default function CategoryMixCard({ delay }) {
  const { data = [] } = useCategorySales();
  const { rangeB, inRange, labelRange } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const hasData = data.length > 0;
  if (!hasData) {
    return (
      <EvidenceCard sources={["prestashop"]}
        question="¿Qué categorías de producto venden más?"
        answer="Se enciende con el dato de catálogo" answerTone="neutral" maturity="amber"
        actions={[{ verb: "investigar", rationale: "Poblar category_sales desde PrestaShop (Gestor SQL: order_detail → categoría). Ver CLAUDE.md §16." }]}
        delay={delay}
        note="Fuente: PrestaShop · category_sales (ventas por categoría principal y mes, canal web)." />
    );
  }

  // ── Vista A: mix del periodo activo ──
  const period = data.filter(r => inRange(rangeB, r));
  const byCat = {};
  for (const r of period) byCat[r.category] = (byCat[r.category] || 0) + (Number(r.revenue) || 0);
  const totalRev = Object.values(byCat).reduce((s, v) => s + v, 0);
  const mix = Object.entries(byCat).map(([category, revenue]) => ({ category, revenue, pct: totalRev ? (revenue / totalRev) * 100 : 0 }))
    .sort((a, b) => b.revenue - a.revenue);
  const top = mix[0];

  // ── Vista B: evolución mensual por categoría (hasta el corte, últimos 18 meses) ──
  const catsOrder = mix.map(m => m.category); // por relevancia en el periodo
  const topCats = catsOrder.slice(0, 5);
  const byMonth = {};
  for (const r of data) {
    const ym = r.year * 12 + r.month;
    if (ym > cutoff) continue;
    (byMonth[ym] ||= { ym, label: `${monthLabel(r.month)} ${String(r.year).slice(2)}` });
    const key = topCats.includes(r.category) ? r.category : "Otras";
    byMonth[ym][key] = (byMonth[ym][key] || 0) + (Number(r.revenue) || 0);
  }
  const series = Object.values(byMonth).sort((a, b) => a.ym - b.ym).slice(-18);
  const seriesKeys = [...topCats, ...(series.some(s => s["Otras"]) ? ["Otras"] : [])];

  // Crecimiento de Gatos: compara primer vs último tramo en la serie (insight de mix)
  const gatosKey = "Tienda de Productos para Gatos";
  let gatosNote = "";
  if (series.length >= 6) {
    const first = series.slice(0, 3).reduce((s, r) => s + (r[gatosKey] || 0), 0) / 3;
    const last = series.slice(-3).reduce((s, r) => s + (r[gatosKey] || 0), 0) / 3;
    if (first > 0) { const g = ((last - first) / first) * 100; if (g >= 15) gatosNote = ` Gatos crece ${g.toFixed(0)}% en el periodo mostrado (gana peso en el mix).`; }
  }

  const altView = (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(36,16%,89%)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 9, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} interval={Math.max(0, Math.floor(series.length / 8))} />
          <YAxis tick={{ fontSize: 8, fill: "hsl(32,7%,48%)" }} axisLine={false} tickLine={false} tickFormatter={v => fmtCurrency(v)} width={44} />
          <Tooltip formatter={(v, n) => [fmtCurrency(v), short(n)]} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11 }} />
          <Legend formatter={(v) => short(v)} wrapperStyle={{ fontSize: 10 }} />
          {seriesKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} name={k} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Qué categorías de producto venden más?"
      answer={top ? `${short(top.category)} lidera · ${top.pct.toFixed(0)}% del ingreso` : "Mix por categoría"}
      answerTone="neutral"
      context={`Reparto del ingreso web por categoría principal · ${labelRange(rangeB)}.${gatosNote}`}
      kpis={[
        { value: fmtCurrency(totalRev), label: `Ingreso categorizado · ${labelRange(rangeB)}` },
        { value: `${top ? top.pct.toFixed(0) : 0}%`, label: `Peso de ${top ? short(top.category) : "—"}` },
        { value: mix.length, label: "Categorías con venta" },
      ]}
      maturity="amber"
      actions={[
        { verb: "priorizar", rationale: "El grueso del ingreso se concentra en pocas categorías: asegura stock, visibilidad y campañas en las líderes, y vigila las que ganan peso en la vista de evolución." },
        { verb: "investigar", rationale: "Categoría = categoría principal (depth-2) del producto. El ingreso es de línea de pedido (con IVA, antes de descuentos de pedido); sirve para comparar el mix, no para cuadrar con la caja neta." },
      ]}
      delay={delay}
      altView={altView}
      viewLabels={{ a: "Mix", b: "Evolución" }}
      note="Fuente: PrestaShop · category_sales (order_detail → producto → categoría principal, canal web, excluye Amazon y TPV). Dato REAL de catálogo por venta (sustituye la inferencia por nombre de campaña). Ingreso de línea con IVA."
    >
      <div className="mt-1 space-y-1.5">
        {mix.map((m, i) => (
          <div key={m.category}>
            <div className="flex items-baseline justify-between text-xs mb-0.5">
              <span className="text-foreground truncate max-w-[60%]" title={m.category}>{short(m.category)}</span>
              <span className="font-mono text-muted-foreground">{fmtCurrency(m.revenue)} · <span className="text-foreground font-semibold">{m.pct.toFixed(0)}%</span></span>
            </div>
            <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
              <div className="h-full rounded" style={{ width: `${Math.max(1, m.pct)}%`, background: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        ))}
      </div>
    </EvidenceCard>
  );
}
