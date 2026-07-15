/**
 * SaludResumen — ¿de qué se compone el revenue del período? Reparto por CATEGORÍA real de
 * producto (PrestaShop · category_sales), que RECONCILIA con el titular de la portada
 * (~€1.5M de venta web). Sustituye al antiguo reparto por 2 líneas (Connectif), que sumaba
 * ~€901K y no cuadraba con el titular. Misma base = una sola historia coherente.
 */
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import EvidenceCard from "../EvidenceCard";
import { useCategorySales } from "@/lib/useEntities";
import { useComparison } from "@/lib/ComparisonContext";
import { fmtCurrency, monthLabel } from "@/lib/dashboardData";
import { CHART_H, GRID, AXIS, TIP } from "@/lib/dss/chartTheme";

const COLORS = ["hsl(16,79%,57%)", "hsl(186,32%,42%)", "hsl(45,45%,50%)", "hsl(4,39%,55%)", "hsl(140,30%,45%)", "hsl(32,10%,60%)"];
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

export default function SaludResumen() {
  const { data = [] } = useCategorySales();
  const { rangeB, inRange, labelRange } = useComparison();
  const cutoff = rangeB.end.year * 12 + rangeB.end.month;

  const hasData = data.length > 0;

  // Reparto del período activo
  const per = data.filter(r => inRange(rangeB, r));
  const byCat = {};
  for (const r of per) byCat[r.category] = (byCat[r.category] || 0) + (Number(r.revenue) || 0);
  const total = Object.values(byCat).reduce((s, v) => s + v, 0);
  const mix = Object.entries(byCat).map(([cat, rev]) => ({ cat, rev, pct: total ? (rev / total) * 100 : 0 }))
    .sort((a, b) => b.rev - a.rev);
  const top = mix[0];

  // Evolución mensual del reparto (últimos 12 meses hasta el corte), apilado por top-5 + Otras
  const topCats = mix.slice(0, 5).map(m => m.cat);
  const byM = {};
  for (const r of data) {
    const k = r.year * 12 + r.month; if (k > cutoff) continue;
    (byM[k] ||= { k, name: `${monthLabel(r.month)} ${String(r.year).slice(2)}` });
    const key = topCats.includes(r.category) ? short(r.category) : "Otras";
    byM[k][key] = (byM[k][key] || 0) + (Number(r.revenue) || 0);
  }
  const series = Object.values(byM).sort((a, b) => a.k - b.k).slice(-12);
  const seriesKeys = [...topCats.map(short), ...(series.some(s => s["Otras"]) ? ["Otras"] : [])];

  return (
    <EvidenceCard sources={["prestashop"]}
      question="¿Cómo se reparte el revenue por categoría?"
      answer={!hasData ? "Sin datos para el período seleccionado" : undefined}
      maturity="amber"
      note="Reparto de la venta web real por categoría principal (PrestaShop · category_sales). Reconcilia con el titular de revenue de la portada (misma base). Ingreso de línea con IVA."
    >
      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Foto del período: barras por categoría */}
          <div className="flex flex-col justify-center space-y-1.5">
            <div className="flex items-baseline justify-between text-xs mb-0.5">
              <span className="text-muted-foreground">Total categorizado · {labelRange(rangeB)}</span>
              <span className="font-semibold text-foreground">{fmtCurrency(total)}</span>
            </div>
            {mix.map((m, i) => (
              <div key={m.cat}>
                <div className="flex items-baseline justify-between text-xs mb-0.5">
                  <span className="text-foreground truncate max-w-[58%]" title={m.cat}>{short(m.cat)}</span>
                  <span className="font-mono text-muted-foreground">{fmtCurrency(m.rev)} · <span className="text-foreground font-semibold">{m.pct.toFixed(0)}%</span></span>
                </div>
                <div className="h-2.5 rounded bg-muted/50 overflow-hidden">
                  <div className="h-full rounded" style={{ width: `${Math.max(1, m.pct)}%`, background: COLORS[i % COLORS.length] }} />
                </div>
              </div>
            ))}
            {top && <p className="text-[10px] text-muted-foreground mt-1">{short(top.cat)} concentra el {top.pct.toFixed(0)}% de la venta web del período.</p>}
          </div>

          {/* Evolución mensual del reparto (últimos 12 meses) */}
          {series.length >= 2 && (
            <div className={CHART_H}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 5, right: 8, left: 4, bottom: 0 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="name" {...AXIS} interval={Math.max(0, Math.floor(series.length / 6))} />
                  <YAxis {...AXIS} tickFormatter={(v) => `€${(v / 1000).toFixed(0)}K`} />
                  <Tooltip formatter={(v, n) => [fmtCurrency(v), n]} {...TIP} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 10 }} />
                  {seriesKeys.map((k, i) => (
                    <Bar key={k} dataKey={k} stackId="1" fill={COLORS[i % COLORS.length]} radius={i === seriesKeys.length - 1 ? [3, 3, 0, 0] : [0, 0, 0, 0]} maxBarSize={26} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </EvidenceCard>
  );
}
