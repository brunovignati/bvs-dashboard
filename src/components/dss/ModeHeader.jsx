export default function ModeHeader({ title, cadence, question, blurb }) {
  return (
    <div className="pb-1">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h1 className="text-2xl font-bold font-heading text-foreground">{title}</h1>
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{cadence}</span>
      </div>
      <p className="text-sm font-medium text-foreground/80 mt-1">{question}</p>
      {blurb && <p className="text-xs text-muted-foreground mt-0.5 max-w-2xl">{blurb}</p>}
    </div>
  );
}
