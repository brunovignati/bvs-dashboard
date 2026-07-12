import { useState } from "react";
import { ComparisonProvider } from "@/lib/ComparisonContext";
import DomainNav from "@/components/dss/DomainNav";
import DailyHealth from "@/components/dss/views/DailyHealth";
import GrowthMarketing from "@/components/dss/views/GrowthMarketing";
import OpsCRM from "@/components/dss/views/OpsCRM";
import Marketing from "@/components/dss/domains/Marketing";

const VIEW_MAP = {
  daily: DailyHealth,
  growth: GrowthMarketing,
  marketing: Marketing,
  ops: OpsCRM,
};

export default function DecisionSupport() {
  const [view, setView] = useState("daily");
  const View = VIEW_MAP[view] || DailyHealth;

  return (
    <ComparisonProvider>
      <div className="min-h-screen bg-background">
        <DomainNav active={view} onSelect={setView} />
        <main className="max-w-[1400px] mx-auto px-4 md:px-8 py-8 w-full space-y-6">
          <View />
          {/* Leyenda única de estados e indicadores (evita explicar los chips en cada tarjeta) */}
          <footer className="pt-4 mt-2 border-t border-border/60 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
            <span className="font-semibold uppercase tracking-widest text-[10px]">Leyenda</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-600 border-amber-500/20">◐ Madura</span> mejora con más histórico</span>
            <span className="inline-flex items-center gap-1.5"><span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-muted text-muted-foreground border-border">○ Falta dato</span> aún no fiable</span>
            <span className="inline-flex items-center gap-1.5"><span className="text-primary font-semibold">▲ / ▼</span> variación vs el periodo comparado</span>
            <span className="text-muted-foreground/70">Sin chip = dato al día.</span>
          </footer>
        </main>
      </div>
    </ComparisonProvider>
  );
}
