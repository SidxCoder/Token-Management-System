import TabHeader from "@/app/components/dashboard/TabHeader";
import AddOrder from "@/app/components/features/AddOrder";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function NewOrderPage() {
  await requireAccess("create_order");
  const nav = navBySlug("new-order");
  return (
    <>
      <TabHeader title={nav?.label ?? "New Order"} description={nav?.description} />
      <AddOrder />
    </>
  );
}
