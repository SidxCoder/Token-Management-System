import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { ROLE_CONFIG } from "@/app/components/login";
import { toUserRole } from "@/app/components/shared/api";
import Sidebar from "@/app/components/dashboard/Sidebar";
import { visibleNav } from "./nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const items = visibleNav(user.role).map(({ slug, label, description }) => ({
    slug,
    label,
    description,
  }));
  const roleLabel = ROLE_CONFIG[toUserRole(user.role)]?.label ?? user.role;

  return (
    <div className="flex min-h-screen w-full flex-1 flex-col bg-slate-50 text-slate-700 md:flex-row">
      <Sidebar items={items} displayName={user.display_name} roleLabel={roleLabel} />
      <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
