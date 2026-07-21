import TabHeader from "@/app/components/dashboard/TabHeader";
import OrdersBrowser from "@/app/components/features/OrdersBrowser";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function OrdersPage() {
  await requireAccess("search_orders");
  const nav = navBySlug("orders");
  return (
    <>
      <TabHeader title={nav?.label ?? "Orders"} description={nav?.description} />
      <OrdersBrowser />
    </>
  );
}
