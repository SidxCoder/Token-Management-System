import TabHeader from "@/app/components/dashboard/TabHeader";
import ImportOrders from "@/app/components/features/ImportOrders";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function ImportPage() {
  await requireAccess("upload_excel");
  const nav = navBySlug("import");
  return (
    <>
      <TabHeader title={nav?.label ?? "Import"} description={nav?.description} />
      <ImportOrders />
    </>
  );
}
