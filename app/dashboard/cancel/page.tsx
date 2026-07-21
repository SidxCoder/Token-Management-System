import TabHeader from "@/app/components/dashboard/TabHeader";
import CancelToken from "@/app/components/features/CancelToken";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function CancelPage() {
  await requireAccess("cancel_token");
  const nav = navBySlug("cancel");
  return (
    <>
      <TabHeader title={nav?.label ?? "Cancel Token"} description={nav?.description} />
      <CancelToken />
    </>
  );
}
