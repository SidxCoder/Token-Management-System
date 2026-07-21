import TabHeader from "@/app/components/dashboard/TabHeader";
import DeliveryDesk from "@/app/components/features/DeliveryDesk";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function DeliveryPage() {
  await requireAccess("deliver");
  const nav = navBySlug("delivery");
  return (
    <>
      <TabHeader title={nav?.label ?? "Delivery"} description={nav?.description} />
      <DeliveryDesk />
    </>
  );
}
