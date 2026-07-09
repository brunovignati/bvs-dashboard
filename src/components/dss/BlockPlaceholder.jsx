import { MATURITY } from "@/lib/dss/dssUtils";

/**
 * BlockPlaceholder — bloque de evidencia previsto pero aún no construido.
 * Se muestra para que el dominio esté completo en visión (con su badge de madurez),
 * sin fingir que hay datos donde no los hay.
 */
export default function BlockPlaceholder({ question, viz, maturity = "amber", note }) {
  const m = MATURITY[maturity] || MATURITY.amber;
  return (
    <div className="bg-card/60 border border-dashed border-border rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3 mb-1">
        <h3 className="text-sm font-semibold text-foreground/80 leading-snug">{question}</h3>
        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${m.cls} whitespace-nowrap`}>
          {m.symbol} {m.label}
        </span>
      </div>
      {viz && <p className="text-xs text-muted-foreground">{viz}</p>}
      {note && <p className="text-[10px] text-muted-foreground mt-1 italic">{note}</p>}
    </div>
  );
}
