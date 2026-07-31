import TabHeader from "@/app/components/dashboard/TabHeader";
import Overrides from "@/app/components/features/Overrides";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";
import { queryOrders, serializeOrders } from "@/lib/orderQuery";
import { QUERIES } from "@/app/components/shared/queries";

export default async function OverridesPage() {
  const user = await requireAccess("override_status");
  // Fetched here so the first screenful ships with the HTML instead of
  // costing a second round trip after the component mounts.
  const page = await queryOrders({ ...QUERIES.overrides, role: user.role, userId: user.id });
  const nav = navBySlug("overrides");
  return (
    <>
      <TabHeader title={nav?.label ?? "Overrides"} description={nav?.description} />
      <Overrides
        initialOrders={serializeOrders(page.orders)}
        initialTotal={page.total}
      />
    </>
  );
}
