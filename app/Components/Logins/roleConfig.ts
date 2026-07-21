import type { RoleConfig, UserRole } from "./types";

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  greeter: {
    label: "Greeter",
    description: "Search orders, verify customers, and issue tokens",
    homePath: "/dashboard",
    accent: "text-emerald-700 dark:text-emerald-400",
  },
  packager: {
    label: "Packager",
    description: "Pack orders, manage bag numbers, hand over to runner",
    homePath: "/dashboard",
    accent: "text-blue-700 dark:text-blue-400",
  },
  runner: {
    label: "Runner",
    description: "Collect bags and hand orders over to cashier",
    homePath: "/dashboard",
    accent: "text-amber-700 dark:text-amber-400",
  },
  cashier: {
    label: "Cashier",
    description: "Verify tokens and mark orders as delivered",
    homePath: "/dashboard",
    accent: "text-violet-700 dark:text-violet-400",
  },
  admin: {
    label: "Admin",
    description: "Manage users, stats, overrides, and reports",
    homePath: "/dashboard",
    accent: "text-rose-700 dark:text-rose-400",
  },
};

export const ALL_ROLES: UserRole[] = ["greeter", "packager", "runner", "cashier", "admin"];
