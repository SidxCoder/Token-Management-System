import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { can, type Action } from "@/lib/permissions";
import { firstAllowedSlug } from "./nav";

// Server-side guard for a tab page. Redirects unauthenticated users to /login
// and users who lack the permission to their own first accessible tab, so the
// sidebar is never the only thing standing between a role and a feature.
export async function requireAccess(action: Action) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  if (!can(user.role, action)) {
    const home = firstAllowedSlug(user.role);
    redirect(home ? `/dashboard/${home}` : "/login");
  }

  return user;
}
