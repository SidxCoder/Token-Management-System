import type { UserRole } from "@/app/components/login";

export type OrderStatus =
  | "PACKAGING_PENDING"
  | "PACKAGED"
  | "TOKEN_ISSUED"
  | "HANDOVER"
  | "READY_FOR_PICKUP"
  | "DELIVERED";

export type OrderLine = {
  id: string;
  product_name: string;
  bag_number: number | null;
  packed?: boolean;
  sku_code?: string;
};

export type Order = {
  id: string;
  order_id: string;
  customer_name: string;
  phone: string;
  status: OrderStatus;
  token_number: number | null;
  number_of_items: number;
  bagged_count?: number;
  Order_Lines: OrderLine[];
};

export type ApiUser = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  active: boolean;
};

export function toUserRole(role: string): UserRole {
  return role.toLowerCase() as UserRole;
}

export function toApiRole(role: UserRole): string {
  return role.toUpperCase();
}

export async function fetchOrders(params?: {
  q?: string;
  status?: OrderStatus;
}): Promise<Order[]> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.status) sp.set("status", params.status);
  const qs = sp.toString();
  const res = await fetch(`/api/orders${qs ? `?${qs}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load orders");
  return (data.orders ?? []) as Order[];
}

export async function orderAction(
  orderId: string,
  action: string,
  payload: Record<string, unknown> = {},
) {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Action "${action}" failed`);
  return data;
}

export type NewOrderLine = {
  product_name: string;
  sku_code?: string;
  sku_description?: string;
  bag_number?: string;
};

export type NewOrderInput = {
  order_id: string;
  customer_name: string;
  phone: string;
  items: NewOrderLine[];
};

export async function createOrder(input: NewOrderInput): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to create order");
  return data as Order;
}

export type UploadIssue = { sheet: string; row: number; message: string };

export type UploadResult =
  | { ok: true; orders: number; items: number; prePacked: number }
  | { ok: false; errors: UploadIssue[] };

// Upload the orders workbook. The API returns every validation error at once
// (import is all-or-nothing), so this surfaces the full list, falling back to a
// single synthetic issue for non-validation failures (e.g. network/500).
export async function uploadOrders(file: File): Promise<UploadResult> {
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch("/api/orders/upload", { method: "POST", body });
  } catch {
    return { ok: false, errors: [{ sheet: "-", row: 0, message: "Network error — could not reach the server" }] };
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    return { ok: true, orders: data.orders ?? 0, items: data.items ?? 0, prePacked: data.prePacked ?? 0 };
  }
  const errors: UploadIssue[] = Array.isArray(data.errors) && data.errors.length
    ? (data.errors as UploadIssue[])
    : [{ sheet: "-", row: 0, message: data.error ?? "Upload failed" }];
  return { ok: false, errors };
}

export function statusLabel(status: OrderStatus) {
  return status
    .toLowerCase()
    .split("_")
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

export function baggedCount(order: Order) {
  return (
    order.bagged_count ??
    order.Order_Lines.filter((l) => l.bag_number != null).length
  );
}
