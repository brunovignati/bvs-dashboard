/** Selector de tienda en forma de chips (Todas + una por tienda). Lo usan las tarjetas de Tiendas con filtro por tienda. */
export default function PosStoreChips({ stores, value, onChange }) {
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      {["Todas", ...stores].map((s) => (
        <button key={s} type="button" onClick={() => onChange(s)}
          className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${value === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
          {s}
        </button>
      ))}
    </div>
  );
}
