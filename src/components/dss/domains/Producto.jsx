import DomainHeader from "../DomainHeader";
import OwnBrandCard from "../cards/OwnBrandCard";
import BlockPlaceholder from "../BlockPlaceholder";

export default function Producto() {
  return (
    <div className="space-y-4">
      <DomainHeader title="Producto" objetivo="Hacer crecer la marca propia (margen superior) y entender qué se vende." />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <OwnBrandCard delay={0.05} />
        <BlockPlaceholder
          question="PR-2 · ¿Qué categorías crecen?"
          viz="Línea/barras por categoría."
          maturity="red"
          note="Hoy solo hay una categoría con ventas propias (nutracéuticos). Se activa al exportar más categorías desde Connectif."
        />
      </div>
    </div>
  );
}
