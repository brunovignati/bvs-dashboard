import { useState } from "react";
import DomainNav from "@/components/dss/DomainNav";
import { DOMAINS } from "@/lib/dss/domains";
import SaludDelNegocio from "@/components/dss/domains/SaludDelNegocio";
import Revenue from "@/components/dss/domains/Revenue";
import Clientes from "@/components/dss/domains/Clientes";
import Marketing from "@/components/dss/domains/Marketing";
import Automatizaciones from "@/components/dss/domains/Automatizaciones";
import CRM from "@/components/dss/domains/CRM";
import Producto from "@/components/dss/domains/Producto";
import Operaciones from "@/components/dss/domains/Operaciones";

const VIEWS = {
  salud: SaludDelNegocio,
  revenue: Revenue,
  clientes: Clientes,
  marketing: Marketing,
  automatizaciones: Automatizaciones,
  crm: CRM,
  producto: Producto,
  operaciones: Operaciones,
};

export default function DecisionSupport() {
  const [domain, setDomain] = useState("salud");
  const View = VIEWS[domain] || SaludDelNegocio;

  return (
    <div className="flex min-h-screen bg-background">
      <DomainNav active={domain} onSelect={setDomain} />
      <main className="flex-1 min-w-0">
        {/* Selector móvil */}
        <div className="md:hidden border-b border-border p-2 flex gap-1 overflow-x-auto">
          {DOMAINS.map((d) => (
            <button key={d.id} onClick={() => setDomain(d.id)}
              className={`text-xs px-3 py-1.5 rounded-lg whitespace-nowrap ${domain === d.id ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground"}`}>
              {d.label}
            </button>
          ))}
        </div>

        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 w-full">
          <View />
          <div className="text-center py-8 mt-4 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
              BVS Analytics · Dashboard de marketing · organizado por preguntas de negocio
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
