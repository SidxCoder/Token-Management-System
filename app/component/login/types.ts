export type UserRole = "admin" | "packager" | "greeter" | "runner" | "cashier";

export type User = {
  id: string;
  username: string;
  display_name: string;
  role: UserRole;
  active: boolean;
};

export type RoleConfig = {
  label: string;
  description: string;
  homePath: string;
  accent: string;
};

export type LoginResponse = {
  user?: {
    id: number;
    username: string;
    display_name: string;
    role: UserRole;
  };
  role?: UserRole;
  redirectTo?: string;
  error?: string;
};

export type UsersResponse = {
  users?: User[];
  user?: User;
  error?: string;
};
