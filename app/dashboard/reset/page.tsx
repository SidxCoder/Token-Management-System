import TabHeader from "@/app/components/dashboard/TabHeader";
import ResetData from "@/app/components/admin/ResetData";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function ResetPage() {
  await requireAccess("reset_data");
  const nav = navBySlug("reset");
  return (
    <>
      <TabHeader title={nav?.label ?? "Reset Data"} description={nav?.description} />
      <ResetData />
    </>
  );
}
