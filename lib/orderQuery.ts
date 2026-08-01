import { prisma } from "./db";
import { Status } from "./generated/prisma/enums";
import type { Order } from "@/app/components/shared/api";

// Shared by /api/orders and by the dashboard pages. Pages call this directly so
// the first screenful of data is server-rendered with the HTML instead of the
// browser making a second round trip after mount — every one of those crosses a
// region boundary, so a page that renders and *then* fetches costs roughly
// twice what it needs to.

export const PAGE_SIZE = 100;

// Infinite scroll grows a window rather than walking pages: the client asks for
// a larger pageSize as it scrolls. Offset paging would be unsafe here because
// orders change status while you scroll, shifting rows between requests and
// silently skipping or duplicating them — and the 4s poll on every list would
// collapse an appended list back to the first page.
export const MAX_PAGE_SIZE = 1000;

// Every sort ends with order_id, which is unique. Without that tiebreaker the
// ordering is not deterministic: a bulk import stamps every row with the same
// uploaded_at, so "newest" is entirely tied, and Postgres is free to return a
// different arbitrary slice for each LIMIT'd query — which the 4s poll on these
// lists would surface as rows shuffling on their own.
const TIEBREAK = { order_id: "asc" } as const;

// Only the line fields any component actually reads. `sku_description` and the
// repeated `order_ref_id` uuid were ~28% of the list payload and nothing renders
// them; the full row is still available from /api/orders/[orderId].
const LINE_SELECT = {
  id: true,
  product_name: true,
  bag_number: true,
  sku_code: true,
  // Which lines have physically moved to the runner (partial handover).
  handed_over: true,
} as const;

const SORTS = {
  newest: [{ uploaded_at: "desc" }, TIEBREAK],
  oldest: [{ uploaded_at: "asc" }, TIEBREAK],
  order_id: [TIEBREAK],
  name: [{ customer_name: "asc" }, TIEBREAK],
  token: [{ token_number: { sort: "asc", nulls: "last" } }, TIEBREAK],
  token_desc: [{ token_number: { sort: "desc", nulls: "last" } }, TIEBREAK],
} as const;

export type BaseSortKey = keyof typeof SORTS;

// `first_<STATUS>` pins one status to the top of the list. Prisma's orderBy
// cannot express ORDER BY CASE, so a pinned page is assembled from two ordered
// queries instead — that keeps `where` the single source of truth for filtering
// rather than restating it in raw SQL.
const STATUS_FIRST = "first_";

// Rows behind the pinned status fall in the declaration order of `enum Status`
// in schema.prisma, which is NOT the pipeline order the dropdown lists.
const REST_ORDER = [{ status: "asc" }, TIEBREAK] as const;

export function pinnedStatus(sort: string): Status | null {
  if (!sort.startsWith(STATUS_FIRST)) return null;
  const name = sort.slice(STATUS_FIRST.length);
  return name in Status ? (name as Status) : null;
}

export function isValidSort(sort: string) {
  return sort in SORTS || pinnedStatus(sort) !== null;
}

// A server component hands these straight to a client component, which would
// otherwise receive Date objects where the same data from /api/orders arrives as
// ISO strings. Round-tripping through JSON makes both paths identical, so the
// server-rendered first screenful and the first poll agree exactly.
// The return type is the client-side shape, not the input's: the round trip is
// what turns Date columns into the ISO strings `Order` declares.
export function serializeOrders(orders: unknown[]): Order[] {
  return JSON.parse(JSON.stringify(orders)) as Order[];
}

export type OrderQueryInput = {
  q?: string;
  statuses?: Status[];
  hasToken?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
  /** Scope to the signed-in station. Derived from the session, never the client. */
  mine?: boolean;
  /** Match orders that have at least one line in this handover state. */
  linesHandedOver?: boolean;
  role?: string;
  userId?: string;
};

export async function queryOrders(input: OrderQueryInput) {
  const page = Number.isInteger(input.page) && input.page! >= 1 ? input.page! : 1;
  const pageSize =
    Number.isInteger(input.pageSize) && input.pageSize! >= 1
      ? Math.min(input.pageSize!, MAX_PAGE_SIZE)
      : PAGE_SIZE;

  const sortRaw = input.sort ?? "newest";
  const pinned = pinnedStatus(sortRaw);
  const sort = (pinned ? "newest" : sortRaw) as BaseSortKey;

  const q = input.q?.trim() ?? "";
  const statuses = input.statuses ?? [];

  // Strict scoping: a runner sees only what has been routed to them. This used
  // to also match `runner_id: null`, which meant every runner saw every
  // unassigned order — an order sent to Runner 1 showed up on Runner 2's screen
  // too. Assignment now happens at handover, so there is no unassigned pool.
  const mineFilter =
    input.mine && input.role === "RUNNER"
      ? { runner_id: input.userId }
      : input.mine && input.role === "CASHIER"
        ? { cashier_id: input.userId }
        : {};

  const where = {
    ...(statuses.length ? { status: { in: statuses } } : {}),
    ...(input.hasToken ? { token_number: { not: null } } : {}),
    // Partial handover splits an order across stages, so the queues filter on
    // line state rather than on order status alone.
    ...(input.linesHandedOver !== undefined
      ? { Order_Lines: { some: { handed_over: input.linesHandedOver } } }
      : {}),
    ...mineFilter,
    ...(q
      ? {
          OR: [
            { order_id: { contains: q, mode: "insensitive" as const } },
            { customer_name: { contains: q, mode: "insensitive" as const } },
            { phone: { contains: q, mode: "insensitive" as const } },
            // The token desks search by the number printed on the token;
            // token_number is an Int, so it only matches a numeric query.
            ...(/^\d+$/.test(q) ? [{ token_number: Number(q) }] : []),
          ],
        }
      : {}),
  };

  const skip = (page - 1) * pageSize;

  // Two round trips, not four: the counts settle together, then both page
  // queries run together.
  async function pinnedPage(status: Status, topTotal: number) {
    const top = { AND: [where, { status }] };
    const rest = { AND: [where, { status: { not: status } }] };

    const takeTop = Math.max(0, Math.min(pageSize, topTotal - skip));
    const takeRest = pageSize - takeTop;

    const [topRows, restRows] = await Promise.all([
      takeTop
        ? prisma.orders.findMany({
            where: top,
            orderBy: [TIEBREAK],
            skip,
            take: takeTop,
            include: { Order_Lines: { select: LINE_SELECT } },
          })
        : [],
      takeRest
        ? prisma.orders.findMany({
            where: rest,
            orderBy: [...REST_ORDER],
            skip: Math.max(0, skip - topTotal),
            take: takeRest,
            include: { Order_Lines: { select: LINE_SELECT } },
          })
        : [],
    ]);

    return [...topRows, ...restRows];
  }

  const [total, topTotal] = await Promise.all([
    prisma.orders.count({ where }),
    pinned
      ? prisma.orders.count({ where: { AND: [where, { status: pinned }] } })
      : Promise.resolve(0),
  ]);

  const orders = pinned
    ? await pinnedPage(pinned, topTotal)
    : await prisma.orders.findMany({
        where,
        orderBy: [...SORTS[sort]],
        skip,
        take: pageSize,
        include: { Order_Lines: { select: LINE_SELECT } },
      });

  return {
    orders: orders.map((o) => ({
      ...o,
      bagged_count: o.Order_Lines.filter((l) => l.bag_number != null).length,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  };
}
