/**
 * OpsCRM — vista de mantenimiento: salud de la base (CRM), maquinaria de envío
 * (Operaciones) y producto. Reutiliza los dominios existentes como sub-secciones.
 */
import CRM from "../domains/CRM";
import Operaciones from "../domains/Operaciones";
import SectionNav from "../SectionNav";

// Producto (temáticas) se fusionó en Growth › Revenue como composición del revenue;
// "marca propia" ya vivía allí. Ops & CRM queda como mantenimiento: base + envío.
export default function OpsCRM() {
  return (
    <div className="space-y-6">
      <SectionNav sections={[
        { id: "sec-crm", label: "CRM" },
        { id: "sec-envio", label: "Salud de envío" },
      ]} />
      <div id="sec-crm" className="scroll-mt-28"><CRM index={1} total={2} /></div>
      <div id="sec-envio" className="scroll-mt-28"><Operaciones index={2} total={2} /></div>
    </div>
  );
}
