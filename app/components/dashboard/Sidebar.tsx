"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { NavItem } from "@/app/dashboard/nav";
import { LogoutIcon, NAV_ICONS, OrdersIcon, ShieldLock } from "./icons";

type SidebarProps = {
  items: Pick<NavItem, "slug" | "label" | "description">[];
  displayName: string;
  roleLabel: string;
};

export default function Sidebar({ items, displayName, roleLabel }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const brand = (
    <div className="flex items-center gap-2.5 px-5 py-5">
      <ShieldLock className="h-7 w-7 text-blue-600" />
      <span className="text-sm font-bold uppercase tracking-wider text-blue-600">
        Token System
      </span>
    </div>
  );

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
      {items.map((item) => {
        const href = `/dashboard/${item.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        const Icon = NAV_ICONS[item.slug] ?? OrdersIcon;
        return (
          <Link
            key={item.slug}
            href={href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className={`h-5 w-5 shrink-0 ${active ? "text-blue-600" : ""}`} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar — pinned to the viewport so it stays in place while the
          main content scrolls; the nav scrolls internally if it overflows. */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col self-start border-r border-slate-200 bg-white md:flex">
        {brand}
        {nav}
        <ProfileFooter displayName={displayName} roleLabel={roleLabel} />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <ShieldLock className="h-6 w-6 text-blue-600" />
          <span className="text-sm font-bold uppercase tracking-wider text-blue-600">
            Token System
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700"
        >
          Menu
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-30 bg-slate-900/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-slate-200 bg-white shadow-xl">
            {brand}
            {nav}
            <ProfileFooter displayName={displayName} roleLabel={roleLabel} />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function ProfileFooter({
  displayName,
  roleLabel,
}: {
  displayName: string;
  roleLabel: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initial = displayName.trim().charAt(0).toUpperCase() || "?";

  async function logout() {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="border-t border-slate-200 p-3">
      <div className="flex items-center gap-3 rounded-lg px-2 py-2">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
          {initial}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">
            {displayName}
          </span>
          <span className="block text-xs font-medium uppercase tracking-wider text-slate-400">
            {roleLabel}
          </span>
        </span>
      </div>
      <button
        type="button"
        onClick={logout}
        disabled={busy}
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:opacity-60"
      >
        <LogoutIcon className="h-4 w-4" />
        {busy ? "Logging out…" : "Logout"}
      </button>
    </div>
  );
}
