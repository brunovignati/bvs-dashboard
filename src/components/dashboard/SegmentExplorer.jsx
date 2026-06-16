import { useSegments } from "@/lib/useEntities";
import { fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import { Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function SegmentExplorer() {
  // ✅ MIGRADO: datos reales de Supabase
  const { data: segments = [] } = useSegments();

  const top = [...segments]
    .sort((a, b) => (b.contacts || 0) - (a.contacts || 0))
    .slice(0, 15);

  const max = top[0]?.contacts || 1;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Segmentos de Audiencia"
        subtitle={`Top ${top.length} segmentos por tamaño · ${fmtNumber(segments.length)} segmentos totales`}
        icon={Layers}
        badge="Segmentos"
      />

      {top.length === 0 ? (
        <p className="text-muted-foreground text-sm">Cargando datos...</p>
      ) : (
        <div className="space-y-2">
          {top.map((seg, i) => {
            const pct = (seg.contacts / max) * 100;
            return (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-medium truncate max-w-[70%]" title={seg.segment}>
                    {seg.segment}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">{fmtNumber(seg.contacts)}</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.03 }}
                    className="h-full rounded-full"
                    style={{
                      background: `hsl(${217 + i * 8}, ${Math.max(40, 91 - i * 4)}%, ${Math.min(70, 50 + i * 2)}%)`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
