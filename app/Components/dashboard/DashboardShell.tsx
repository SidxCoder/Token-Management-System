import type { ReactNode } from "react";
import { ROLE_CONFIG } from "@/app/components/logins";
import type { UserRole } from "@/app/components/logins";
import LogoutButton from "./LogoutButton";

type DashboardShellProps = {
  role: UserRole;
  title: string;
  description?: string;
  children: ReactNode;
};

export default function DashboardShell({ role, title, description, children }: DashboardShellProps) {
  const config = ROLE_CONFIG[role];

  return (
    <div className="min-h-full flex-1 bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${config.accent}`}>{config.label}</p>
            <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">{title}</h1>
            {description ? (
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{description}</p>
            ) : null}
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
