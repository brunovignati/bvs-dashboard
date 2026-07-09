/**
 * ModeNav — navegación por modos de decisión (no por dataset).
 * Orden: de la cadencia más alta (diaria) a la más baja (trimestral) + Biblioteca.
 */
import { MODES } from "@/lib/dss/dssUtils";

export default function ModeNav({ active, onSelect, signalCount = 0 }) {
  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card/40 min-h-screen sticky top-0 hidden md:flex flex-col">
      <div className="px-4 py-5 border-b border-border">
        <p className="text-sm font-bold font-heading text-foreground leading-tight">BVS · DSS</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Decision Support System</p>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {MODES.map((m) => {
          const Icon = m.icon;
          const isActive = active === m.id;
          return (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={`w-full text-left rounded-xl px-3 py-2.5 transition-colors group ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-muted/60 text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold flex-1">{m.label}</span>
                {m.id === "pulso" && signalCount > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? "bg-primary-foreground/20 text-primary-foreground" : "bg-red-500 text-white"
                  }`}>
                    {signalCount}
                  </span>
                )}
              </div>
              <p className={`text-[10px] mt-0.5 pl-[26px] ${isActive ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                {m.cadence}
              </p>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <p className="text-[9px] text-muted-foreground leading-relaxed">
          Evidencia, no automatización. El sistema organiza la evidencia; la decisión es tuya.
        </p>
      </div>
    </aside>
  );
}
