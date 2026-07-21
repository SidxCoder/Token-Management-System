import TabHeader from "@/app/components/dashboard/TabHeader";
import UserManagement from "@/app/components/admin/UserManagement";
import { requireAccess } from "../access";
import { navBySlug } from "../nav";

export default async function UsersPage() {
  await requireAccess("manage_users");
  const nav = navBySlug("users");
  return (
    <>
      <TabHeader title={nav?.label ?? "Users"} description={nav?.description} />
      <UserManagement />
    </>
  );
}
