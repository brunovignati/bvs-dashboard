// Encabezado de sección limpio (estilo ventriloc): título en negrita + descripción
// gris, sin barra de acento. Marca el inicio de cada sección de la vista.
export default function DomainHeader({ title, objetivo }) {
  return (
    <div className="pb-1">
      <h1 className="text-2xl font-bold font-heading text-foreground leading-tight tracking-tight">{title}</h1>
      {objetivo && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{objetivo}</p>}
    </div>
  );
}
