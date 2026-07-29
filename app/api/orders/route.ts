import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db";
import { Status } from "@/lib/generated/prisma/enums";
import { can } from "@/lib/permissions";
import { createOrder, WorkflowError } from "@/lib/orders";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 100

// Infinite scroll grows a window rather than walking pages: the client asks for
// a larger pageSize as it scrolls. Offset paging would be unsafe here because
// orders change status while you scroll, shifting rows between requests and
// silently skipping or duplicating them — and the 4s poll on every list would
// collapse an appended list back to the first page.
const MAX_PAGE_SIZE = 1000

// Allow-list of sort keys the client may ask for. Sorting has to happen here
// rather than in the browser: the client only ever receives one page, so a
// client-side sort would only reorder the first PAGE_SIZE rows.
// Every sort ends with order_id, which is unique. Without that tiebreaker the
// ordering is not deterministic: a bulk import stamps every row with the same
// uploaded_at, so "newest" is entirely tied, and Postgres is free to return a
// different arbitrary slice for each LIMIT'd query — which the 4s poll on these
// lists would surface as rows shuffling on their own.
const TIEBREAK = { order_id: "asc" } as const;

const SORTS = {
    newest: [{ uploaded_at: "desc" }, TIEBREAK],
    oldest: [{ uploaded_at: "asc" }, TIEBREAK],
    order_id: [TIEBREAK],
    name: [{ customer_name: "asc" }, TIEBREAK],
    token: [{ token_number: { sort: "asc", nulls: "last" } }, TIEBREAK],
    token_desc: [{ token_number: { sort: "desc", nulls: "last" } }, TIEBREAK],
} as const;

type SortKey = keyof typeof SORTS;

// `first_<STATUS>` pins one status to the top of the list. Prisma's orderBy
// cannot express ORDER BY CASE, so a pinned page is assembled from two ordered
// queries instead — that keeps the `where` built in GET as the single source of
// truth for filtering, rather than restating it in raw SQL.
const STATUS_FIRST = "first_";

// Rows behind the pinned status fall in the declaration order of `enum Status`
// in schema.prisma, which is NOT the pipeline order the dropdown lists.
const REST_ORDER = [{ status: "asc" }, TIEBREAK] as const;

function pinnedStatus(sort: string): Status | null {
    if (!sort.startsWith(STATUS_FIRST)) return null;
    const name = sort.slice(STATUS_FIRST.length);
    return name in Status ? (name as Status) : null;
}

export async function GET(req: NextRequest) {
    const user = await getSessionUser();

    if(!user) return NextResponse.json({
        error: "unauthenticated"
    },{
        status: 401
    })

    if(!can(user.role, "search_orders")) {
        return NextResponse.json({
            error: "forbidden"
        },{
            status: 403
        })
    }

    const sp = req.nextUrl.searchParams;

    const pageRaw = Number(sp.get("page") ?? 1);
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

    const sizeRaw = Number(sp.get("pageSize") ?? PAGE_SIZE);
    const pageSize = Number.isInteger(sizeRaw) && sizeRaw >= 1
        ? Math.min(sizeRaw, MAX_PAGE_SIZE)
        : PAGE_SIZE;

    const q = sp.get("q")?.trim() ?? "";
    const statusRaw = sp.get("status");

    // `status` accepts a comma-separated list so a queue can ask for exactly the
    // statuses it shows (e.g. packing wants three of them). Filtering these in
    // the browser would break once the result set exceeds one page.
    const statuses = statusRaw
        ? statusRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const invalidStatus = statuses.find((s) => !(s in Status));
    if(invalidStatus){
        return NextResponse.json({
            error: ` invalid status "${invalidStatus}"`
        },{
            status: 400
        })
    }

    const sortRaw = sp.get("sort");
    const pinned = sortRaw ? pinnedStatus(sortRaw) : null;
    if(sortRaw && !pinned && !(sortRaw in SORTS)){
        return NextResponse.json({
            error: `invalid sort "${sortRaw}"`
        },{
            status: 400
        })
    }
    const sort = (pinned ? "newest" : (sortRaw ?? "newest")) as SortKey;

    // Queues that key off "has a token" (cancel, issued-token list) need this
    // server-side for the same paging reason as `status`.
    const hasToken = sp.get("hasToken") === "1";

    const where = {
        ...(statuses.length ? {status: { in: statuses as Status[] }} : {}),
        ...(hasToken ? {token_number: { not: null }} : {}),
        ...(q ? {
            OR: [
                { order_id: { contains: q, mode: "insensitive" as const } },
                { customer_name: { contains: q, mode: "insensitive" as const }},
                { phone: { contains: q, mode: "insensitive" as const }},
                // The token desks search by the number printed on the token;
                // token_number is an Int, so it only matches a numeric query.
                ...(/^\d+$/.test(q) ? [{ token_number: Number(q) }] : []),
            ]
        } : {})
     }


    const skip = (page - 1) * pageSize;

    // Pinned page: take what fits from the pinned status, then top the page up
    // from everything else. Splitting it this way keeps `skip`/`take` correct on
    // any page rather than only the first.
    async function pinnedPage(status: Status) {
        const top = { AND: [where, { status }] };
        const rest = { AND: [where, { status: { not: status } }] };

        const topTotal = await prisma.orders.count({ where: top });
        const takeTop = Math.max(0, Math.min(pageSize, topTotal - skip));

        const topRows = takeTop
            ? await prisma.orders.findMany({
                  where: top,
                  orderBy: [TIEBREAK],
                  skip,
                  take: takeTop,
                  include: { Order_Lines: true },
              })
            : [];

        const takeRest = pageSize - topRows.length;
        const restRows = takeRest
            ? await prisma.orders.findMany({
                  where: rest,
                  orderBy: [...REST_ORDER],
                  skip: Math.max(0, skip - topTotal),
                  take: takeRest,
                  include: { Order_Lines: true },
              })
            : [];

        return [...topRows, ...restRows];
    }

    const [total, orders] = await Promise.all([
        prisma.orders.count({ where }),
        pinned
            ? pinnedPage(pinned)
            : prisma.orders.findMany({
                  where,
                  orderBy: [...SORTS[sort]],
                  skip,
                  take: pageSize,
                  include: { Order_Lines: true},
              })
    ])

    return NextResponse.json({
        orders: orders.map((o)=> ({
            ...o,
            bagged_count: o.Order_Lines.filter((l) => l.bag_number !=null).length,
        })),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
    })
}

export async function POST(req: NextRequest) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

    try {
        const body = await req.json().catch(() => ({}));
        const order = await createOrder(user, body);
        return NextResponse.json(order, { status: 201 });
    } catch (e) {
        if (e instanceof WorkflowError) {
            return NextResponse.json({ error: e.message }, { status: e.status });
        }
        throw e;
    }
}