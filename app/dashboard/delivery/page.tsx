import TabHeader from "@/app/components/dashboard/TabHeader";
import DeliveryDesk from "@/app/components/features/DeliveryDesk";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";
import { queryOrders, serializeOrders } from "@/lib/orderQuery";
import { QUERIES } from "@/app/components/shared/queries";

export default async function DeliveryPage() {
  const user = await requireAccess("deliver");
  // Fetched here so the first screenful ships with the HTML instead of
  // costing a second round trip after the component mounts.
  const page = await queryOrders({ ...QUERIES.delivery, role: user.role, userId: user.id });
  const nav = navBySlug("delivery");
  return (
    <>
      <TabHeader title={nav?.label ?? "Delivery"} description={nav?.description} />
      <DeliveryDesk
        initialOrders={serializeOrders(page.orders)}
        initialTotal={page.total}
      />
    </>
  );
}
