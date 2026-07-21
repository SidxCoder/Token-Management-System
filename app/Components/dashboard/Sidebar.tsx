"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "./LogoutButton";
import type { NavItem } from "@/app/dashboard/nav";

type SidebarProps = {
  items: Pick<NavItem, "slug" | "label" | "description">[];
  displayName: string;
  roleLabel: string;
};

export default function Sidebar({ items, displayName, roleLabel }: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {items.map((item) => {
        const href = `/dashboard/${item.slug}`;
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={item.slug}
            href={href}
            onClick={() => setMobileOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-zinc-900 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-zinc-200 px-4 py-4">
      <p className="text-sm font-semibold text-zinc-900">{displayName}</p>
      <p className="mb-3 text-xs font-medium uppercase tracking-wider text-zinc-400">
        {roleLabel}
      </p>
      <LogoutButton />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-zinc-200 bg-white md:flex">
        <div className="border-b border-zinc-200 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Token System
          </p>
          <h1 className="mt-0.5 text-lg font-bold text-zinc-900">Dashboard</h1>
        </div>
        {nav}
        {footer}
      </aside>

      {/* Mobile top bar */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3 md:hidden">
        <h1 className="text-base font-bold text-zinc-900">Dashboard</h1>
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          aria-label="Toggle navigation"
          className="rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700"
        >
          Menu
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="md:hidden">
          <div
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
              <h1 className="text-base font-bold text-zinc-900">Dashboard</h1>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700"
              >
                Close
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      ) : null}
    </>
  );
}
