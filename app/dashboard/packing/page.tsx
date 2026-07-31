import TabHeader from "@/app/components/dashboard/TabHeader";
import PackingQueue from "@/app/components/features/PackingQueue";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";
import { queryOrders, serializeOrders } from "@/lib/orderQuery";
import { QUERIES } from "@/app/components/shared/queries";

export default async function PackingPage() {
  const user = await requireAccess("set_bag_number");
  // Fetched here so the first screenful ships with the HTML instead of
  // costing a second round trip after the component mounts.
  const page = await queryOrders({ ...QUERIES.packing, role: user.role, userId: user.id });
  const nav = navBySlug("packing");
  return (
    <>
      <TabHeader title={nav?.label ?? "Packing"} description={nav?.description} />
      <PackingQueue
        initialOrders={serializeOrders(page.orders)}
        initialTotal={page.total}
      />
    </>
  );
}
