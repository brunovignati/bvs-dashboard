import { useState } from "react";
import { useMonthlyMetrics } from "@/lib/useEntities";
import { pearsonCorrelation } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { GitMerge } from "lucide-react";
import { motion } from "framer-motion";

function naturalLang(k1, k2, r) {
  const dir   = r > 0 ? 'suben juntos' : 'se mueven en sentido opuesto';
  const str   = Math.abs(r) > 0.8 ? 'muy fuerte' : Math.abs(r) > 0.6 ? 'fuerte' : Math.abs(r) > 0.4 ? 'moderada' : 'débil';
  return `Cuando ${k1} sube, ${k2} tiende a ${r > 0 ? 'subir' : 'bajar'} también. Correlación ${str} (${r > 0 ? 'positiva' : 'negativa'}): ${dir}.`;
}

export default function CorrelationMatrix() {
  const [tooltip, setTooltip] = useState(null);
  // ✅ MIGRADO: datos reales de Supabase
  const { data: rawMetrics = [] } = useMonthlyMetrics();
  const data = [...rawMetrics].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);

  if (data.length < 3) return null; // necesitamos al menos 3 puntos para correlación

  const vars = {
    "Compras":    data.map(d => d.purchases  || 0),
    "Revenue":    data.map(d => d.revenue    || 0),
    "Avg Ticket": data.map(d => d.avgPurchase || 0),
    "Email Attr": data.map(d => d.emailAttr  || 0),
    "Web Attr":   data.map(d => d.webAttr    || 0),
    "Push Attr":  data.map(d => d.pushAttr   || 0),
  };

  const keys   = Object.keys(vars);
  const matrix = keys.map(k1 => keys.map(k2 => pearsonCorrelation(vars[k1], vars[k2])));

  const getColor = (val) => {
    const abs = Math.abs(val);
    if (abs > 0.8) return val > 0 ? "bg-emerald-500/80 text-white" : "bg-red-500/80 text-white";
    if (abs > 0.6) return val > 0 ? "bg-emerald-500/40 text-foreground" : "bg-red-500/40 text-foreground";
    if (abs > 0.4) return val > 0 ? "bg-emerald-500/20 text-foreground" : "bg-red-500/20 text-foreground";
    return "bg-muted/50 text-muted-foreground";
  };

  const correlations = [];
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      correlations.push({ var1: keys[i], var2: keys[j], corr: matrix[i][j] });
    }
  }
  const sorted = correlations.sort((a, b) => Math.abs(b.corr) - Math.abs(a.corr));
  const pushCorr = sorted.find(s => s.var2 === 'Push Attr' || s.var1 === 'Push Attr');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Matriz de Correlación"
        subtitle={`Pearson r · ${data.length} meses de datos · Relaciones estadísticas entre variables`}
        icon={GitMerge}
        badge="Estadística"
      />

      <div className="overflow-x-auto mb-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="text-[10px] uppercase tracking-wider text-muted-foreground p-2 text-left" />
              {keys.map(k => (
                <th key={k} className="text-[10px] uppercase tracking-wider text-muted-foreground p-2 text-center whitespace-nowrap">{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {keys.map((k1, i) => (
              <tr key={k1}>
                <td className="text-[10px] uppercase tracking-wider text-muted-foreground p-2 font-semibold whitespace-nowrap">{k1}</td>
                {keys.map((k2, j) => (
                  <td key={k2} className="p-1 relative group">
                    <div
                      className={`text-center text-xs font-mono font-medium rounded-lg py-2 px-1 cursor-default ${getColor(matrix[i][j])}`}
                      onMouseEnter={() => i !== j && setTooltip({ k1: k1, k2: k2, r: matrix[i][j] })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      {matrix[i][j].toFixed(2)}
                    </div>
                    {tooltip && tooltip.k1 === k1 && tooltip.k2 === k2 && i !== j && (
                      <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-1 w-48 bg-card border border-border rounded-xl p-2.5 shadow-xl text-[10px] text-foreground pointer-events-none">
                        {naturalLang(k1, k2, matrix[i][j])}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Correlaciones Clave</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
        {sorted.slice(0, 6).map((c, i) => (
          <div key={i} className="flex items-center gap-2 p-2.5 bg-muted/50 rounded-xl">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono font-bold ${getColor(c.corr)}`}>
              {c.corr.toFixed(2)}
            </div>
            <div>
              <p className="text-[10px] font-semibold">{c.var1} × {c.var2}</p>
              <p className="text-[10px] text-muted-foreground">
                {Math.abs(c.corr) > 0.8 ? 'Muy fuerte' : Math.abs(c.corr) > 0.6 ? 'Fuerte' : 'Moderada'}
                {c.corr > 0 ? ' positiva' : ' negativa'}
              </p>
            </div>
          </div>
        ))}
      </div>

      <InsightCard
        type="info"
        title="Interpretación Estadística"
        description={`La correlación más fuerte es ${sorted[0]?.var1} × ${sorted[0]?.var2} (r=${sorted[0]?.corr.toFixed(2)}). La atribución web muestra la mayor correlación con compras totales, mientras que push muestra una correlación ${pushCorr?.corr < 0 ? 'negativa' : 'débil'} indicando un canal en declive. El ticket medio crece independientemente del volumen (baja correlación con compras).`}
      />
    </motion.div>
  );
}
