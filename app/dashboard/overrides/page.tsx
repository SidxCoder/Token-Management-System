import TabHeader from "@/app/components/dashboard/TabHeader";
import Overrides from "@/app/components/features/Overrides";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function OverridesPage() {
  await requireAccess("override_status");
  const nav = navBySlug("overrides");
  return (
    <>
      <TabHeader title={nav?.label ?? "Overrides"} description={nav?.description} />
      <Overrides />
    </>
  );
}
