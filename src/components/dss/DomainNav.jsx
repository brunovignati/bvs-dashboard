/**
 * DomainNav — navegación por dominios de negocio + comparador de periodos.
 * El comparador vive en el panel izquierdo (usable desde aquí) para liberar
 * espacio en la parte superior y ver mejor cada sección.
 */
import { VIEWS } from "@/lib/dss/domains";
import ComparisonPanel from "@/components/dashboard/ComparisonPanel";

export default function DomainNav({ active, onSelect }) {
  return (
    <aside className="w-64 shrink-0 border-r border-border bg-card/40 h-screen sticky top-0 self-start hidden md:flex flex-col overflow-y-auto">
      <div className="px-4 py-4 border-b border-border">
        <p className="text-sm font-bold font-heading text-foreground leading-tight">BVS Analytics</p>
      </div>
      <nav className="p-2 space-y-1">
        {VIEWS.map((d) => {
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
      {/* Comparador de periodos — afecta a todo el panel */}
      <div className="border-t border-border p-2">
        <ComparisonPanel />
      </div>
    </aside>
  );
}
