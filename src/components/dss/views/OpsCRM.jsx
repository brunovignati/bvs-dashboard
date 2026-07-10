/**
 * OpsCRM — vista de mantenimiento: salud de la base (CRM), maquinaria de envío
 * (Operaciones) y producto. Reutiliza los dominios existentes como sub-secciones.
 */
import CRM from "../domains/CRM";
import Operaciones from "../domains/Operaciones";
import Producto from "../domains/Producto";

export default function OpsCRM() {
  return (
    <div className="space-y-8">
      <CRM />
      <Operaciones />
      <Producto />
    </div>
  );
}
