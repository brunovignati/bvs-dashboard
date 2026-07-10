import DomainHeader from "../DomainHeader";
import SubscriberHealth from "@/components/dashboard/SubscriberHealth";
import SegmentExplorer from "@/components/dashboard/SegmentExplorer";
import SocialAudienceCard from "../cards/SocialAudienceCard";

export default function CRM() {
  return (
    <div className="space-y-6">
      <DomainHeader title="CRM" objetivo="Dirigir el marketing a la audiencia correcta y mantener la base de contactos sana." />
      <SubscriberHealth />
      <SocialAudienceCard delay={0.05} />
      <SegmentExplorer />
    </div>
  );
}
