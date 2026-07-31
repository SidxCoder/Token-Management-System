import TabHeader from "@/app/components/dashboard/TabHeader";
import TokenDesk from "@/app/components/features/TokenDesk";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";
import { queryOrders, serializeOrders } from "@/lib/orderQuery";
import { QUERIES } from "@/app/components/shared/queries";

export default async function TokensPage() {
  const user = await requireAccess("issue_token");
  // Both tabs are fetched here, in parallel, so neither costs a round trip
  // after the component mounts.
  const [search, issued] = await Promise.all([
    queryOrders({ ...QUERIES.tokenSearch, role: user.role, userId: user.id }),
    queryOrders({ ...QUERIES.tokenIssued, role: user.role, userId: user.id }),
  ]);
  const nav = navBySlug("tokens");
  return (
    <>
      <TabHeader title={nav?.label ?? "Tokens"} description={nav?.description} />
      <TokenDesk
        initialOrders={serializeOrders(search.orders)}
        initialTotal={search.total}
        initialIssued={serializeOrders(issued.orders)}
        initialIssuedTotal={issued.total}
      />
    </>
  );
}
