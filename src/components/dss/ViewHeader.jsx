/**
 * ViewHeader — cabecera enriquecida de vista: "Vista │ Sección" + metadatos
 * (fecha de datos y comparación) + pill "● En vivo". Mismo patrón en las 4 vistas.
 */
export default function ViewHeader({ view, section, meta }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl md:text-[28px] font-bold font-heading tracking-tight text-foreground leading-tight">
          {view}
          {section && <span className="text-muted-foreground font-semibold">{"  │  "}{section}</span>}
        </h1>
        {meta && <p className="text-xs text-muted-foreground mt-1">{meta}</p>}
      </div>
      <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> En vivo
      </span>
    </div>
  );
}
