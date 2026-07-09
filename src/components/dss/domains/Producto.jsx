import DomainHeader from "../DomainHeader";
import OwnBrandCard from "../cards/OwnBrandCard";
import ProductThemeCard from "../cards/ProductThemeCard";

export default function Producto() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Producto" objetivo="Hacer crecer la marca propia (margen superior) y entender qué se vende." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OwnBrandCard delay={0.05} />
        <ProductThemeCard delay={0.1} />
      </div>
    </div>
  );
}
