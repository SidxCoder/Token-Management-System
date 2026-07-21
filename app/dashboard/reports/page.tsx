import TabHeader from "@/app/components/dashboard/TabHeader";
import ReportsPanel from "@/app/components/features/ReportsPanel";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function ReportsPage() {
  await requireAccess("view_reports");
  const nav = navBySlug("reports");
  return (
    <>
      <TabHeader title={nav?.label ?? "Reports"} description={nav?.description} />
      <ReportsPanel />
    </>
  );
}
