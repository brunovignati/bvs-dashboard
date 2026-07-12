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
        </main>
      </div>
    </ComparisonProvider>
  );
}
