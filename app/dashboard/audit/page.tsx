import TabHeader from "@/app/components/dashboard/TabHeader";
import AuditLog from "@/app/components/features/AuditLog";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function AuditPage() {
  await requireAccess("view_audit");
  const nav = navBySlug("audit");
  return (
    <>
      <TabHeader title={nav?.label ?? "Audit"} description={nav?.description} />
      <AuditLog />
    </>
  );
}
