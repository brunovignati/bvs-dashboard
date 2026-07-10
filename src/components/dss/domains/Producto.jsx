import DomainHeader from "../DomainHeader";
import ProductThemeCard from "../cards/ProductThemeCard";

// "Marca propia y su peso" se trasladó a Revenue (Growth & Marketing): encaja mejor
// como composición del revenue. Producto queda con temáticas (proxy de nombres de
// campaña) hasta que exista dato de catálogo por venta (ver CLAUDE.md §16).
export default function Producto() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Producto" objetivo="Entender qué se vende. (Mix por categoría y margen: pendiente de dato de catálogo por venta.)" />
      <ProductThemeCard delay={0.05} />
    </div>
  );
}
