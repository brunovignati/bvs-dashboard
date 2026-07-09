/**
 * DomainNav — navegación por dominios de negocio. Entrada libre a cualquiera,
 * sin recorridos ni vocabulario nuevo (filosofía GA4/Looker/Power BI).
 */
import { DOMAINS } from "@/lib/dss/domains";

export default function DomainNav({ active, onSelect }) {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/40 min-h-screen sticky top-0 hidden md:flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <p className="text-sm font-bold font-heading text-foreground leading-tight">BVS Analytics</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Dashboard de marketing</p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {DOMAINS.map((d) => {
          const Icon = d.icon;
          const isActive = active === d.id;
          return (
            <button key={d.id} onClick={() => onSelect(d.id)}
              className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-foreground"}`}>
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">{d.label}</span>
              </div>
            </button>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border">
        <p className="text-[9px] text-muted-foreground leading-relaxed">
          La información se organiza por preguntas de negocio. La evidencia la ves tú; la decisión es tuya.
        </p>
      </div>
    </aside>
  );
}
