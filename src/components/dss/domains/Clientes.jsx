import DomainHeader from "../DomainHeader";
import CohortAnalysis from "@/components/dashboard/CohortAnalysis";
import ChannelSegmentation from "@/components/dashboard/ChannelSegmentation";
import CustomerValueCard from "../cards/CustomerValueCard";

export default function Clientes() {
  return (
    <div className="space-y-6">
      <DomainHeader title="Clientes" objetivo="La economía del comprador: si el negocio crece captando o fidelizando." />
      <CohortAnalysis />
      <ChannelSegmentation />
      <CustomerValueCard delay={0.05} />
    </div>
  );
}
