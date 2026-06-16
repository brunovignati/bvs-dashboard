import { useStickyData } from "@/lib/useEntities";
import { fmtCurrency, fmtNumber } from "@/lib/dashboardData";
import SectionHeader from "./SectionHeader";
import InsightCard from "./InsightCard";
import { Globe } from "lucide-react";
import { motion } from "framer-motion";

export default function StickyWebContent() {
  // ✅ MIGRADO: datos reales de Supabase
  const { data: stickyData = [] } = useStickyData();

  const topSticky = [...stickyData].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
  const best = topSticky[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-card border border-border rounded-2xl p-5"
    >
      <SectionHeader
        title="Sticky Bars & Web Content"
        subtitle="Rendimiento de suscripción via sticky"
        icon={Globe}
        badge="Web"
      />

      {topSticky.length === 0 ? (
        <p className="text-muted-foreground text-sm">Cargando datos...</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {topSticky.map((s, i) => (
              <div key={i} className="p-4 bg-muted/50 rounded-xl">
                <p className="text-xs font-semibold mb-3 truncate" title={s.workflow}>{s.workflow}</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Vistas</p>
                    <p className="text-lg font-bold font-heading">{fmtNumber(s.opens)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Clics</p>
                    <p className="text-lg font-bold font-heading">{fmtNumber(s.clicks)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Conv. Rate</p>
                    <p className="text-lg font-bold font-heading text-primary">
                      {s.convRate !== undefined ? `${Number(s.convRate).toFixed(2)}%` : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
                    <p className="text-lg font-bold font-heading text-emerald-500">{fmtCurrency(s.revenue)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {best && (
            <InsightCard
              type="success"
              title="Sticky Bar: Máquina de Conversión"
              description={`La sticky bar principal "${best.workflow}" genera ${fmtNumber(best.clicks)} clics con un ${Number(best.convRate || 0).toFixed(2)}% de conversión a compra. Con ${fmtCurrency(best.revenue)} en revenue, es un canal de adquisición altamente rentable con cero coste de envío.`}
            />
          )}
        </>
      )}
    </motion.div>
  );
}
