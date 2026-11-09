import TabHeader from "@/app/components/dashboard/TabHeader";
import ErpPanel from "@/app/components/features/erp/ErpPanel";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function ErpPage() {
  await requireAccess("view_erp");
  const nav = navBySlug("erp");
  return (
    <>
      <TabHeader
        title={nav?.label ?? "ERP / Staff Roster"}
        description={nav?.description ?? "Store staff roster, shift compliance & automated biometric attendance rules"}
      />
      <ErpPanel />
    </>
  );
}
