import { useState, useRef, useEffect } from "react";
import { ComparisonProvider } from "@/lib/ComparisonContext";
import ComparisonPanel from "@/components/dashboard/ComparisonPanel";
import DashboardNav from "@/components/dashboard/DashboardNav";
import StorytellingHero from "@/components/dashboard/StorytellingHero";
import OverviewKPIs from "@/components/dashboard/OverviewKPIs";
import RevenueChart from "@/components/dashboard/RevenueChart";
import EmailPerformance from "@/components/dashboard/EmailPerformance";
import CartRecoveryFunnel from "@/components/dashboard/CartRecoveryFunnel";
import PushAnalysis from "@/components/dashboard/PushAnalysis";
import CohortAnalysis from "@/components/dashboard/CohortAnalysis";
import AttributionAnalysis from "@/components/dashboard/AttributionAnalysis";
import CorrelationMatrix from "@/components/dashboard/CorrelationMatrix";
import DayOfWeekAnalysis from "@/components/dashboard/DayOfWeekAnalysis";
import SubscriberHealth from "@/components/dashboard/SubscriberHealth";
import SegmentExplorer from "@/components/dashboard/SegmentExplorer";
import StickyWebContent from "@/components/dashboard/StickyWebContent";
import AuditComparison from "@/components/dashboard/AuditComparison";
import QuickComparison from "@/components/dashboard/QuickComparison";
import ChannelSegmentation from "@/components/dashboard/ChannelSegmentation";

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("overview");
  const sectionRefs = useRef({});

  const scrollToSection = (id) => {
    setActiveSection(id);
    const el = sectionRefs.current[id];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const setRef = (id) => (el) => {
    sectionRefs.current[id] = el;
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveSection(entry.target.dataset.section);
        });
      },
      { rootMargin: "-160px 0px -60% 0px", threshold: 0.1 }
    );
    Object.values(sectionRefs.current).forEach((el) => { if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <ComparisonProvider>
      <div className="flex min-h-screen bg-background">
        <DashboardNav active={activeSection} onNavigate={scrollToSection} />
        <main className="flex-1 min-w-0 flex flex-col">

          {/* ── Header sticky: Comparador de Periodos ── */}
          <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
            <div className="max-w-6xl mx-auto px-4 md:px-6 py-2">
              <ComparisonPanel />
            </div>
          </div>

          {/* ── Contenido principal (scrollable) ── */}
          <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-8 w-full">

            <section ref={setRef("overview")} data-section="overview">
              <StorytellingHero />
              <div className="mt-6"><QuickComparison /></div>
              <div className="mt-6"><OverviewKPIs /></div>
              <div className="mt-6"><RevenueChart /></div>
            </section>

            <section ref={setRef("email")} data-section="email">
              <EmailPerformance />
            </section>

            <section ref={setRef("cart")} data-section="cart">
              <CartRecoveryFunnel />
            </section>

            <section ref={setRef("push")} data-section="push">
              <PushAnalysis />
            </section>

            <section ref={setRef("cohort")} data-section="cohort">
              <CohortAnalysis />
            </section>

            <section ref={setRef("attribution")} data-section="attribution">
              <AttributionAnalysis />
            </section>

            <section ref={setRef("correlation")} data-section="correlation">
              <CorrelationMatrix />
            </section>

            <section ref={setRef("dayweek")} data-section="dayweek">
              <DayOfWeekAnalysis />
            </section>

            <section ref={setRef("subscribers")} data-section="subscribers">
              <SubscriberHealth />
            </section>

            <section ref={setRef("segments")} data-section="segments">
              <SegmentExplorer />
            </section>

            <section ref={setRef("channels")} data-section="channels">
              <ChannelSegmentation />
            </section>

            <section ref={setRef("sticky")} data-section="sticky">
              <StickyWebContent />
            </section>

            <section ref={setRef("audit")} data-section="audit">
              <AuditComparison />
            </section>

            <div className="text-center py-8 border-t border-border">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                BVS Analytics · Datos actualizados cada noche · Connectif API → Supabase
              </p>
            </div>
          </div>
        </main>
      </div>
    </ComparisonProvider>
  );
}
