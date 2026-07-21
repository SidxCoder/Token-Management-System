import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { firstAllowedSlug } from "./nav";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const home = firstAllowedSlug(user.role);
  redirect(home ? `/dashboard/${home}` : "/login");
}
