import { Role } from "./generated/prisma/client";

// Single source of truth for authorization (plan.md §6).
// Every mutating API route must check `can(user.role, action)` before acting.
export const PERMISSIONS = {
  upload_excel: [Role.PACKAGER, Role.ADMIN],
  toggle_line: [Role.PACKAGER, Role.ADMIN],
  mark_all_packed: [Role.PACKAGER, Role.ADMIN],
  set_bag_number: [Role.PACKAGER, Role.ADMIN],
  search_orders: [Role.PACKAGER, Role.GREETER, Role.ADMIN],
  issue_token: [Role.GREETER, Role.ADMIN],
  hand_to_runner: [Role.PACKAGER, Role.RUNNER, Role.ADMIN],
  hand_to_cashier: [Role.RUNNER, Role.ADMIN],
  deliver: [Role.CASHIER, Role.ADMIN],
  cancel_token: [Role.ADMIN],
  override_status: [Role.ADMIN],
  edit_fields: [Role.ADMIN],
  manage_users: [Role.ADMIN],
  view_reports: [Role.ADMIN],
  view_audit: [Role.ADMIN],
} as const satisfies Record<string, readonly Role[]>;

export type Action = keyof typeof PERMISSIONS;

export function can(role: Role, action: Action): boolean {
  return (PERMISSIONS[action] as readonly Role[]).includes(role);
}
