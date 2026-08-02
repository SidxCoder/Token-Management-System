import type { UserRole } from "@/app/components/login";

export type OrderStatus =
  | "PACKAGING_PENDING"
  | "PACKAGED"
  | "TOKEN_ISSUED"
  | "HANDOVER"
  | "READY_FOR_PICKUP"
  | "PARTIALLY_DELIVERED"
  | "DELIVERED";

export type OrderLine = {
  id: string;
  product_name: string;
  bag_number: number | null;
  packed?: boolean;
  sku_code?: string;
  // Per-item progress. An order can reach the counter in several trips, so the
  // cashier delivers what has arrived and the rest stays outstanding.
  delivered?: boolean;
  // Partial handover: true once this line has physically gone to the runner.
  handed_over?: boolean;
};

export type Order = {
  id: string;
  order_id: string;
  customer_name: string;
  phone: string;
  status: OrderStatus;
  token_number: number | null;
  token_date?: string | null;
  uploaded_at?: string;
  updated_at?: string;
  ready_at?: string | null;
  runner_id?: string | null;
  cashier_id?: string | null;
  number_of_items: number;
  bagged_count?: number;
  Order_Lines: OrderLine[];
};

// Sorting and filtering are server-side: /api/orders returns a single page, so
// reordering or status-filtering in the browser would only ever touch the first
// page. Keep these keys in sync with SORTS in app/api/orders/route.ts.
// `first_<STATUS>` pins that status to the top of the list, with everything
// else following in pipeline order.
export type StatusFirstSort = `first_${OrderStatus}`;

export type SortKey =
  | "newest"
  | "oldest"
  | "order_id"
  | "name"
  | "token"
  | "token_desc"
  | StatusFirstSort;

const BASE_SORT_LABELS: Record<string, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  order_id: "Order ID (A–Z)",
  name: "Customer name (A–Z)",
  token: "Token issued first",
  token_desc: "Latest token first",
};

export function statusFirst(status: OrderStatus): StatusFirstSort {
  return `first_${status}`;
}

export function sortLabel(key: SortKey): string {
  if (key.startsWith("first_")) {
    return `${statusLabel(key.slice("first_".length) as OrderStatus)} first`;
  }
  return BASE_SORT_LABELS[key] ?? key;
}

// Pipeline order, which is also the order statuses fall in behind a pinned one.
export const ALL_STATUSES: OrderStatus[] = [
  "PACKAGING_PENDING",
  "PACKAGED",
  "TOKEN_ISSUED",
  "HANDOVER",
  "READY_FOR_PICKUP",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
];

// Everything still in play — the server-side equivalent of "not delivered".
export const UNDELIVERED_STATUSES: OrderStatus[] = ALL_STATUSES.filter(
  (s) => s !== "DELIVERED",
);

// A list offers a "first" option per status it can actually show, so a queue
// limited to two statuses does not advertise the other four.
export function statusSorts(statuses: OrderStatus[]): SortKey[] {
  return statuses.map(statusFirst);
}

export type ApiUser = {
  id: string;
  username: string;
  display_name: string;
  role: string;
  active: boolean;
  station_number?: number | null;
};

// A runner or cashier that a bag can be handed to.
export type Staff = {
  id: string;
  display_name: string;
  station_number: number | null;
};

// Staff are identified by the station they are working. The name is kept as a
// suffix for accounts created before numbering existed, which have none.
export function staffLabel(role: "Packager" | "Greeter" | "Runner" | "Cashier", s: Staff) {
  return s.station_number != null
    ? `${role} ${s.station_number} — ${s.display_name}`
    : s.display_name;
}

export async function fetchStaff(
  role: "PACKAGER" | "GREETER" | "RUNNER" | "CASHIER",
): Promise<Staff[]> {
  const res = await fetch(`/api/staff?role=${role}`);
  const data = await res.json().catch(() => []);
  if (!res.ok) return [];
  return data as Staff[];
}

export function toUserRole(role: string): UserRole {
  return role.toLowerCase() as UserRole;
}

export function toApiRole(role: UserRole): string {
  return role.toUpperCase();
}

// How many more rows each scroll to the bottom asks for.
export const PAGE_STEP = 100;

export type OrderPage = { orders: Order[]; total: number };

export async function fetchOrders(params?: {
  q?: string;
  status?: OrderStatus | OrderStatus[];
  hasToken?: boolean;
  sort?: SortKey;
  limit?: number;
  // Scope the queue to the signed-in runner/cashier. The server derives the
  // filter from the session role, so this cannot be used to read someone else's.
  mine?: boolean;
  /** Restrict to orders having at least one line in this handover state. */
  linesHandedOver?: boolean;
}): Promise<OrderPage> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set("q", params.q);
  if (params?.status) {
    const list = Array.isArray(params.status) ? params.status : [params.status];
    if (list.length) sp.set("status", list.join(","));
  }
  if (params?.hasToken) sp.set("hasToken", "1");
  if (params?.sort) sp.set("sort", params.sort);
  if (params?.limit) sp.set("pageSize", String(params.limit));
  if (params?.mine) sp.set("mine", "1");
  if (params?.linesHandedOver !== undefined)
    sp.set("lines", params.linesHandedOver ? "1" : "0");
  const qs = sp.toString();
  const res = await fetch(`/api/orders${qs ? `?${qs}` : ""}`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Failed to load orders");
  return {
    orders: (data.orders ?? []) as Order[],
    total: (data.total ?? 0) as number,
  };
}

// Returns the updated order. Callers should feed this straight back into the
// detail pane rather than waiting for the next list refetch: an action often
// moves the order out of the queue it was actioned from (or past the loaded
// window), and then the refetch cannot see it — leaving the screen showing the
// pre-action copy, with buttons that act on a status the order no longer has.
export async function orderAction(
  orderId: string,
  action: string,
  payload: Record<string, unknown> = {},
): Promise<Order> {
  const res = await fetch(`/api/orders/${encodeURIComponent(orderId)}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Action "${action}" failed`);
  return data as Order;
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
