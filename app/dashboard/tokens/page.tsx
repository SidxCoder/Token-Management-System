import TabHeader from "@/app/components/dashboard/TabHeader";
import TokenDesk from "@/app/components/features/TokenDesk";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function TokensPage() {
  await requireAccess("issue_token");
  const nav = navBySlug("tokens");
  return (
    <>
      <TabHeader title={nav?.label ?? "Tokens"} description={nav?.description} />
      <TokenDesk />
    </>
  );
}
