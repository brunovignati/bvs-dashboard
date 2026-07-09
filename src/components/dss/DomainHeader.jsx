export default function DomainHeader({ title, objetivo }) {
  return (
    <div className="pb-1">
      <h1 className="text-2xl font-bold font-heading text-foreground">{title}</h1>
      {objetivo && <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{objetivo}</p>}
    </div>
  );
}
