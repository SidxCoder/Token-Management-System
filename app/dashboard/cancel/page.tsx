import TabHeader from "@/app/components/dashboard/TabHeader";
import CancelToken from "@/app/components/features/CancelToken";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";
import { queryOrders, serializeOrders } from "@/lib/orderQuery";
import { QUERIES } from "@/app/components/shared/queries";

export default async function CancelPage() {
  const user = await requireAccess("cancel_token");
  // Fetched here so the first screenful ships with the HTML instead of
  // costing a second round trip after the component mounts.
  const page = await queryOrders({ ...QUERIES.cancel, role: user.role, userId: user.id });
  const nav = navBySlug("cancel");
  return (
    <>
      <TabHeader title={nav?.label ?? "Cancel Token"} description={nav?.description} />
      <CancelToken
        initialOrders={serializeOrders(page.orders)}
        initialTotal={page.total}
      />
    </>
  );
}
