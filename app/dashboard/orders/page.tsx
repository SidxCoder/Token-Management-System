import TabHeader from "@/app/components/dashboard/TabHeader";
import OrdersBrowser from "@/app/components/features/OrdersBrowser";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";
import { queryOrders, serializeOrders } from "@/lib/orderQuery";
import { QUERIES } from "@/app/components/shared/queries";

export default async function OrdersPage() {
  const user = await requireAccess("search_orders");
  // Fetched here so the first screenful ships with the HTML instead of
  // costing a second round trip after the component mounts.
  const page = await queryOrders({ ...QUERIES.orders, role: user.role, userId: user.id });
  const nav = navBySlug("orders");
  return (
    <>
      <TabHeader title={nav?.label ?? "Orders"} description={nav?.description} />
      <OrdersBrowser
        initialOrders={serializeOrders(page.orders)}
        initialTotal={page.total}
      />
    </>
  );
}
