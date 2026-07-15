import DomainHeader from "../DomainHeader";
import CategoryMixCard from "../cards/CategoryMixCard";
import ProductThemeCard from "../cards/ProductThemeCard";

// CategoryMixCard: mix real por categoría (PrestaShop, order_detail → categoría principal).
// Sustituye la inferencia por nombre de campaña como respuesta principal a "qué se vende".
// ProductThemeCard queda como lente complementaria (temáticas en campañas). Ver CLAUDE.md §16.
export default function Producto() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Producto" objetivo="Entender qué se vende: mix real por categoría y su evolución." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="lg:col-span-2"><CategoryMixCard delay={0.04} /></div>
        <div className="lg:col-span-2"><ProductThemeCard delay={0.06} /></div>
      </div>
    </div>
  );
}
