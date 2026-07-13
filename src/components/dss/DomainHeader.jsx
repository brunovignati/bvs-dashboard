// Encabezado de sección limpio: título en negrita + descripción gris, con
// numeración opcional (01 / 04) a la derecha para orientar dentro de la vista.
export default function DomainHeader({ title, index, total }) {
  return (
    <div className="pb-1 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground leading-tight tracking-tight">{title}</h1>
      </div>
      {index && total && (
        <span className="shrink-0 text-[11px] font-semibold tracking-widest text-muted-foreground/60 tabular-nums">
          {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
        </span>
      )}
    </div>
  );
}
