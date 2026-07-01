import { motion } from "framer-motion";
import { BarChart3, Mail, ShoppingCart, Bell, Users, Layers, FileSearch, GitMerge, Calendar, UserCheck, ChevronLeft, ChevronRight, Sparkles, Database, Globe, Instagram, Facebook, Video, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useState } from "react";

const sections = [
  { id: "overview", label: "Resumen", icon: BarChart3 },
  { id: "email", label: "Email", icon: Mail },
  { id: "cart", label: "Carritos", icon: ShoppingCart },
  { id: "push", label: "Push", icon: Bell },
  { id: "cohort", label: "Cohortes", icon: Users },
  { id: "attribution", label: "Atribución", icon: Sparkles },
  { id: "correlation", label: "Correlación", icon: GitMerge },
  { id: "dayweek", label: "Día/Semana", icon: Calendar },
  { id: "subscribers", label: "Suscriptores", icon: UserCheck },
  { id: "segments", label: "Segmentos", icon: Layers },
  { id: "sticky", label: "Web/Sticky", icon: Globe },
  { id: "audit", label: "Auditoría", icon: FileSearch },
  { id: "instagram", label: "Instagram", icon: Instagram },
  { id: "facebook", label: "Facebook", icon: Facebook },
  { id: "tiktok", label: "TikTok", icon: Video },
  { id: "ga4", label: "Web (GA4)", icon: LineChart },
];

export default function DashboardNav({ active, onNavigate }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        className={`hidden lg:flex flex-col h-screen sticky top-0 bg-card border-r border-border transition-all duration-300 ${collapsed ? 'w-16' : 'w-52'}`}
      >
        <div className={`flex items-center gap-2 p-4 border-b border-border ${collapsed ? 'justify-center' : ''}`}>
          {!collapsed && (
            <div>
              <p className="text-sm font-black font-heading tracking-tight">Analytics</p>
              <p className="text-[10px] text-muted-foreground">Marketing Dashboard</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${collapsed ? '' : 'ml-auto'}`}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </Button>
        </div>

        <Link
          to="/data"
          className={`mx-3 mt-3 mb-1 flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors ${collapsed ? 'justify-center px-2' : ''}`}
        >
          <Database className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Gestionar Datos</span>}
        </Link>
        <nav className="flex-1 py-3 overflow-y-auto">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary/10 text-primary border-r-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                } ${collapsed ? 'justify-center px-2' : ''}`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!collapsed && <span>{s.label}</span>}
              </button>
            );
          })}
        </nav>
      </motion.aside>

      {/* Mobile top nav */}
      <div className="lg:hidden sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 px-4 py-2">
          <p className="text-sm font-black font-heading">Analytics</p>
        </div>
        <div className="flex overflow-x-auto gap-1 px-3 pb-2 scrollbar-hide">
          {sections.map((s) => {
            const Icon = s.icon;
            const isActive = active === s.id;
            return (
              <button
                key={s.id}
                onClick={() => onNavigate(s.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                <Icon className="w-3 h-3" />
                {s.label}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
