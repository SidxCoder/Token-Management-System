import type { UserRole } from "./types";

export type DemoUser = {
  id: string;
  display_name: string;
  username: string;
  // Frontend demo only. Prisma stores password_hash and never exposes it.
  password: string;
  role: UserRole;
  active: boolean;
};

export const DEMO_USERS_KEY = "tokenflow-demo-users";

export const defaultDemoUsers: DemoUser[] = [
  { id: "0a0e0001-0000-4000-8000-000000000001", display_name: "Aarav Sharma", username: "admin", password: "admin123", role: "admin", active: true },
  { id: "0a0e0002-0000-4000-8000-000000000002", display_name: "Priya Mehta", username: "cashier", password: "cashier123", role: "cashier", active: true },
  { id: "0a0e0003-0000-4000-8000-000000000003", display_name: "Rohan Verma", username: "runner", password: "runner123", role: "runner", active: true },
  { id: "0a0e0004-0000-4000-8000-000000000004", display_name: "Neha Gupta", username: "packager", password: "packager123", role: "packager", active: true },
  { id: "0a0e0005-0000-4000-8000-000000000005", display_name: "Isha Kapoor", username: "greeter", password: "greeter123", role: "greeter", active: true },
];

export function loadDemoUsers(): DemoUser[] {
  if (typeof window === "undefined") return defaultDemoUsers;
  const saved = window.localStorage.getItem(DEMO_USERS_KEY);
  if (!saved) return defaultDemoUsers;
  try {
    const users = JSON.parse(saved) as Array<Partial<DemoUser> & { name?: string; status?: "Active" | "Inactive" }>;
    if (!Array.isArray(users)) return defaultDemoUsers;
    return users.map((user, index) => ({
      id: String(user.id ?? crypto.randomUUID()),
      display_name: user.display_name ?? user.name ?? user.username ?? "Unnamed user",
      username: user.username ?? `user${index + 1}`,
      password: user.password ?? "",
      role: user.role ?? "runner",
      active: typeof user.active === "boolean" ? user.active : user.status !== "Inactive",
    }));
  } catch {
    return defaultDemoUsers;
  }
}

export function saveDemoUsers(users: DemoUser[]) {
  window.localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(users));
}
