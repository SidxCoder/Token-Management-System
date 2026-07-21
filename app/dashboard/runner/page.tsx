import TabHeader from "@/app/components/dashboard/TabHeader";
import RunnerQueue from "@/app/components/features/RunnerQueue";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function RunnerPage() {
  await requireAccess("hand_to_cashier");
  const nav = navBySlug("runner");
  return (
    <>
      <TabHeader title={nav?.label ?? "Runner"} description={nav?.description} />
      <RunnerQueue />
    </>
  );
}
