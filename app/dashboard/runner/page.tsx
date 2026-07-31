import TabHeader from "@/app/components/dashboard/TabHeader";
import RunnerQueue from "@/app/components/features/RunnerQueue";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";
import { queryOrders, serializeOrders } from "@/lib/orderQuery";
import { QUERIES } from "@/app/components/shared/queries";

export default async function RunnerPage() {
  const user = await requireAccess("hand_to_cashier");
  // Fetched here so the first screenful ships with the HTML instead of
  // costing a second round trip after the component mounts.
  const page = await queryOrders({ ...QUERIES.runner, role: user.role, userId: user.id });
  const nav = navBySlug("runner");
  return (
    <>
      <TabHeader title={nav?.label ?? "Runner"} description={nav?.description} />
      <RunnerQueue
        initialOrders={serializeOrders(page.orders)}
        initialTotal={page.total}
      />
    </>
  );
}
