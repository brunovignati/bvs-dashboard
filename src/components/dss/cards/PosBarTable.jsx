/**
 * PosBarTable (Tiendas) — tabla con barra por fila, igual en todas las tarjetas de tienda:
 * nombre a la izquierda, columnas de cifras alineadas a la derecha con su título en palabras, y una barra debajo.
 *   cols: [{ h: "Ventas", w: 64, title?: "ayuda al pasar el ratón" }]
 *   rows: [{ key, label, cells: [nodo, …], pct: 0-100, color }]   (la 1.ª celda va en negrita)
 */
export default function PosBarTable({ cols, rows }) {
  const tpl = `minmax(0,1fr) ${cols.map((c) => `${c.w || 64}px`).join(" ")}`;
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[380px]">
        <div className="grid gap-x-3 items-end text-[10px] uppercase tracking-wide text-muted-foreground leading-tight pb-1.5 border-b border-border/60" style={{ gridTemplateColumns: tpl }}>
          <span>Tienda</span>
          {cols.map((c) => <span key={c.h} className="text-right" title={c.title}>{c.h}</span>)}
        </div>
        <div className="divide-y divide-border/30">
          {rows.map((r) => (
            <div key={r.key} className="py-1.5">
              <div className="grid gap-x-3 items-baseline text-xs" style={{ gridTemplateColumns: tpl }}>
                <span className="truncate text-foreground" title={r.label}>{r.label}</span>
                {r.cells.map((c, i) => (
                  <span key={i} className={`text-right font-mono ${i === 0 ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{c}</span>
                ))}
              </div>
              <div className="h-1.5 rounded bg-muted/50 overflow-hidden mt-1">
                <div className="h-full rounded" style={{ width: `${Math.max(1, Math.min(100, r.pct))}%`, background: r.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
