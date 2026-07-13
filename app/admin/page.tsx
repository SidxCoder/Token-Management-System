"use client";

import { useState } from "react";
import UserManagement from "@/app/Components/Admin/UserManagement";

type Tab = "overview" | "users" | "roles";

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-5 md:flex">
          <div className="flex items-center gap-3 px-2 py-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-600 text-lg font-bold text-white">T</span><div><p className="font-bold tracking-tight">TokenFlow</p><p className="text-xs text-slate-500">Admin portal</p></div></div>
          <nav className="mt-9 space-y-1">
            <NavItem icon="⌂" label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} />
            <NavItem icon="♙" label="Manage users" active={tab === "users"} onClick={() => setTab("users")} />
            <NavItem icon="⚿" label="Access roles" active={tab === "roles"} onClick={() => setTab("roles")} />
          </nav>
          <div className="mt-auto rounded-xl bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-700">Administrator</p><p className="mt-1 text-xs leading-5 text-slate-500">Manage team accounts and access permissions.</p></div>
        </aside>
        <main className="min-w-0 flex-1 p-5 sm:p-8 lg:p-10">
          <header className="mb-8 flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-indigo-600">ADMINISTRATION</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{tab === "users" ? "User management" : tab === "roles" ? "Access roles" : "Dashboard overview"}</h1><p className="mt-2 text-sm text-slate-500">Control who can access your token management system.</p></div><div className="grid h-10 w-10 place-items-center rounded-full bg-slate-200 text-sm font-bold text-slate-700">AS</div></header>
          <div className="mb-5 flex gap-2 overflow-x-auto md:hidden"><NavItem label="Overview" active={tab === "overview"} onClick={() => setTab("overview")} /><NavItem label="Users" active={tab === "users"} onClick={() => setTab("users")} /><NavItem label="Roles" active={tab === "roles"} onClick={() => setTab("roles")} /></div>
          {tab === "users" ? <UserManagement /> : <Placeholder title={tab === "roles" ? "Access roles" : "Overview"} description={tab === "roles" ? "Roles are assigned directly from Manage users. Select a user’s role to change their system access." : "Select Manage users from the sidebar to add staff, change roles, or remove access."} />}
        </main>
      </div>
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon?: string; label: string; active: boolean; onClick: () => void }) {
  return <button onClick={onClick} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition ${active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}><span className="w-4 text-center text-base">{icon}</span>{label}</button>;
}

function Placeholder({ title, description }: { title: string; description: string }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p></section>;
}
