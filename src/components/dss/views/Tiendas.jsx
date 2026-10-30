/**
 * Tiendas — vista de las tiendas físicas (PrestaShop POS / TPV). Tres bloques:
 * Ventas (por tienda y marca propia) · Descuentos y códigos · ¿Vuelven? (recompra tras código y latas).
 * Fuente única: tablas pos_* de Supabase, refrescadas desde el Gestor SQL de PrestaShop.
 */
import DomainHeader from "../DomainHeader";
import SectionNav from "../SectionNav";
import PosStoreSalesCard from "../cards/PosStoreSalesCard";
import PosBvsBrandCard from "../cards/PosBvsBrandCard";
import PosDiscountsCard from "../cards/PosDiscountsCard";
import PosCodesCard from "../cards/PosCodesCard";
import PosCodeSuccessCard from "../cards/PosCodeSuccessCard";
import PosRetentionCard from "../cards/PosRetentionCard";
import PosLatasCard from "../cards/PosLatasCard";
import { usePosMeta } from "@/lib/useEntities";

export default function Tiendas() {
  const { data: meta = [] } = usePosMeta();
  const at = meta.find((m) => m.key === "pos")?.value?.computed_at;
  const updated = at ? new Date(at).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <div className="space-y-6">
      <SectionNav sections={[
        { id: "sec-ventas", label: "Ventas" },
        { id: "sec-dto", label: "Descuentos y códigos" },
        { id: "sec-vuelta", label: "¿Vuelven?" },
      ]} />
      {updated && <p className="text-[11px] text-muted-foreground -mt-2">Datos de tienda actualizados el {updated}.</p>}
      <section id="sec-ventas" className="scroll-mt-28 space-y-5">
        <DomainHeader title="Ventas por tienda" index={1} total={3} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PosStoreSalesCard delay={0.03} />
          <PosBvsBrandCard delay={0.05} />
        </div>
      </section>
      <section id="sec-dto" className="scroll-mt-28 space-y-5">
        <DomainHeader title="Descuentos y códigos" index={2} total={3} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="lg:col-span-2"><PosDiscountsCard delay={0.03} /></div>
          <PosCodesCard delay={0.05} />
          <PosCodeSuccessCard delay={0.07} />
        </div>
      </section>
      <section id="sec-vuelta" className="scroll-mt-28 space-y-5">
        <DomainHeader title="¿Vuelven los clientes?" index={3} total={3} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PosRetentionCard delay={0.03} />
          <PosLatasCard delay={0.05} />
        </div>
      </section>
    </div>
  );
}
