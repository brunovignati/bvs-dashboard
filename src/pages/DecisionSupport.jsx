import { useState } from "react";
import { ComparisonProvider } from "@/lib/ComparisonContext";
import ComparisonPanel from "@/components/dashboard/ComparisonPanel";
import DomainNav from "@/components/dss/DomainNav";
import { VIEWS } from "@/lib/dss/domains";
import DailyHealth from "@/components/dss/views/DailyHealth";
import GrowthMarketing from "@/components/dss/views/GrowthMarketing";
import OpsCRM from "@/components/dss/views/OpsCRM";

const VIEW_MAP = {
  daily: DailyHealth,
  growth: GrowthMarketing,
  ops: OpsCRM,
};

export default function DecisionSupport() {
  const [view, setView] = useState("daily");
  const View = VIEW_MAP[view] || DailyHealth;

  return (
    <ComparisonProvider>
      <div className="flex min-h-screen bg-background">
        <DomainNav active={view} onSelect={setView} />
        <main className="flex-1 min-w-0">
          {/* Selector móvil de vista */}
          <div className="md:hidden border-b border-border p-2 flex gap-1 overflow-x-auto">
            {VIEWS.map((d) => (
              <button key={d.id} onClick={() => setView(d.id)}
                className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap ${view === d.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}>
                {d.label}
              </button>
            ))}
          </div>

          {/* Comparador de periodos: en desktop vive en el panel izquierdo.
              En móvil (sin sidebar) se muestra aquí arriba. */}
          <div className="md:hidden bg-background/95 border-b border-border">
            <div className="px-4 py-2">
              <ComparisonPanel />
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 w-full space-y-6">
            <View />
          </div>
        </main>
      </div>
    </ComparisonProvider>
  );
}
