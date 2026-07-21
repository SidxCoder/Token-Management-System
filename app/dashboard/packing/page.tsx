import TabHeader from "@/app/components/dashboard/TabHeader";
import PackingQueue from "@/app/components/features/PackingQueue";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function PackingPage() {
  await requireAccess("set_bag_number");
  const nav = navBySlug("packing");
  return (
    <>
      <TabHeader title={nav?.label ?? "Packing"} description={nav?.description} />
      <PackingQueue />
    </>
  );
}
