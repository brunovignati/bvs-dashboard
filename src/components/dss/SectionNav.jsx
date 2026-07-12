/**
 * SectionNav — índice de anclas dentro de una vista larga. Fila de chips pegajosa
 * bajo la barra superior; al pulsar, salta con scroll suave a cada sección.
 * Resuelve la fatiga de scroll y la falta de navegación intra-página.
 */
export default function SectionNav({ sections = [] }) {
  if (sections.length < 2) return null;
  const go = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="sticky top-16 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-2 bg-background/85 backdrop-blur border-b border-border/60 mb-2">
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mr-1 shrink-0">En esta vista</span>
        {sections.map((s) => (
          <button key={s.id} onClick={() => go(s.id)}
            className="text-xs font-medium whitespace-nowrap rounded-full px-3 py-1 bg-muted/60 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors">
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
