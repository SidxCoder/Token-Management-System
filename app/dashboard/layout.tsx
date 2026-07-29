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

  // lg:flex-none on the shell is load-bearing: `body` is a column flex
  // container with an indefinite height, so this item's flex-basis:0% (from
  // flex-1) would resolve to `content` and override lg:h-screen, letting the
  // shell grow past the viewport and scroll the window. Same reason the inner
  // wrapper below needs lg:h-full rather than lg:min-h-full.
  return (
    <div className="flex min-h-screen w-full flex-1 flex-col bg-slate-50 text-slate-700 md:flex-row lg:h-screen lg:flex-none lg:overflow-hidden">
      <Sidebar items={items} displayName={user.display_name} roleLabel={roleLabel} />
      {/* At lg+ the shell is viewport-locked, so `main` becomes the scroll
          container. Pages that opt into the flex chain fill it exactly and
          scroll their own panes; the rest still scroll here as before. */}
      <main className="min-w-0 flex-1 px-5 py-7 sm:px-8 lg:overflow-y-auto lg:px-10">
        <div className="mx-auto flex w-full max-w-6xl flex-col lg:h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
