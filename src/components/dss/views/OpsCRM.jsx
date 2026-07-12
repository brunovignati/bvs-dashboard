/**
 * OpsCRM — vista de mantenimiento: salud de la base (CRM), maquinaria de envío
 * (Operaciones) y producto. Reutiliza los dominios existentes como sub-secciones.
 */
import CRM from "../domains/CRM";
import Operaciones from "../domains/Operaciones";

// Producto (temáticas) se fusionó en Growth › Revenue como composición del revenue;
// "marca propia" ya vivía allí. Ops & CRM queda como mantenimiento: base + envío.
export default function OpsCRM() {
  return (
    <div className="space-y-8">
      <CRM />
      <Operaciones />
    </div>
  );
}
