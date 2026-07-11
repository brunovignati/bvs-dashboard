// Barra de acento celeste a la izquierda del título → marca visualmente el inicio de
// cada sección, diferenciando sub-secciones consecutivas dentro de una misma vista.
export default function DomainHeader({ title, objetivo }) {
  return (
    <div className="pb-1 flex items-stretch gap-3">
      <span className="w-1.5 rounded-full bg-primary shrink-0" aria-hidden="true" />
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground leading-tight">{title}</h1>
        {objetivo && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{objetivo}</p>}
      </div>
    </div>
  );
}
