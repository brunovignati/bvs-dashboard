/**
 * DomainNav — barra de navegación HORIZONTAL superior (estilo ventriloc).
 * Logo/marca a la izquierda, pestañas de vista en el centro, y el comparador de
 * periodos en un desplegable a la derecha (sustituye al antiguo panel lateral).
 */
import { useState } from "react";
import { VIEWS } from "@/lib/dss/domains";
import ComparisonPanel from "@/components/dashboard/ComparisonPanel";
import { SlidersHorizontal } from "lucide-react";

export default function DomainNav({ active, onSelect }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 bg-card/95 backdrop-blur border-b border-border">
      <div className="max-w-[1400px] mx-auto px-4 md:px-8">
        <div className="h-16 flex items-center gap-3">
          {/* Marca */}
          <span className="text-base font-bold font-heading text-foreground shrink-0 tracking-tight">
            BVS <span className="text-primary">Analytics</span>
          </span>

          {/* Pestañas de vista (horizontal, scrollable en móvil) */}
          <nav className="flex items-center gap-1 overflow-x-auto ml-1 md:ml-4 flex-1 no-scrollbar">
            {VIEWS.map((d) => {
              const Icon = d.icon;
              const isActive = active === d.id;
              return (
                <button
                  key={d.id}
                  onClick={() => onSelect(d.id)}
                  className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">{d.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Comparador de periodos (desplegable) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setOpen((o) => !o)}
              className={`flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                open ? "border-primary text-primary" : "border-border text-foreground hover:bg-muted/70"
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">Periodo</span>
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 mt-2 w-72 z-40">
                  <ComparisonPanel />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
