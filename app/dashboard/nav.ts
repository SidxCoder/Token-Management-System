import { can, type Action } from "@/lib/permissions";
import { Role } from "@/lib/generated/prisma/client";

// Single source of truth for the sidebar. Each tab maps to one permission
// `action` (lib/permissions.ts), so a role sees a tab iff `can(role, action)`.
// The same action is re-checked server-side by each page via requireAccess().
export type NavItem = {
  slug: string;
  label: string;
  description: string;
  action: Action;
};

export const NAV_ITEMS: NavItem[] = [
  { slug: "orders", label: "Orders", description: "Search and browse every order", action: "search_orders" },
  { slug: "import", label: "Import", description: "Upload the orders Excel sheet", action: "upload_excel" },
  { slug: "packing", label: "Packing", description: "Assign bags and hand to runner", action: "set_bag_number" },
  { slug: "tokens", label: "Tokens", description: "Issue collection tokens", action: "issue_token" },
  { slug: "cancel", label: "Cancel Token", description: "Cancel an issued token", action: "cancel_token" },
  { slug: "runner", label: "Runner", description: "Collect bags and hand to cashier", action: "hand_to_cashier" },
  { slug: "delivery", label: "Delivery", description: "Verify tokens and deliver", action: "deliver" },
  { slug: "users", label: "Users", description: "Manage staff accounts", action: "manage_users" },
  { slug: "reports", label: "Reports", description: "Daily stats and status counts", action: "view_reports" },
  { slug: "audit", label: "Audit", description: "Review the audit log", action: "view_audit" },
  { slug: "overrides", label: "Overrides", description: "Force orders and bypass steps", action: "override_status" },
];

export function visibleNav(role: Role): NavItem[] {
  return NAV_ITEMS.filter((item) => can(role, item.action));
}

export function firstAllowedSlug(role: Role): string | null {
  return visibleNav(role)[0]?.slug ?? null;
}

export function navBySlug(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}
