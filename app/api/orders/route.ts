import { getSessionUser } from "@/lib/auth"
import { Status } from "@/lib/generated/prisma/enums";
import { can } from "@/lib/permissions";
import { createOrder, WorkflowError } from "@/lib/orders";
import { isValidSort, queryOrders } from "@/lib/orderQuery";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
    const user = await getSessionUser();

    if(!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 })

    if(!can(user.role, "search_orders")) {
        return NextResponse.json({ error: "forbidden" }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams;

    // `status` accepts a comma-separated list so a queue can ask for exactly the
    // statuses it shows (e.g. packing wants three of them).
    const statusRaw = sp.get("status");
    const statuses = statusRaw
        ? statusRaw.split(",").map((s) => s.trim()).filter(Boolean)
        : [];

    const invalidStatus = statuses.find((s) => !(s in Status));
    if(invalidStatus){
        return NextResponse.json({ error: ` invalid status "${invalidStatus}"` }, { status: 400 })
    }

    const sortRaw = sp.get("sort");
    if(sortRaw && !isValidSort(sortRaw)){
        return NextResponse.json({ error: `invalid sort "${sortRaw}"` }, { status: 400 })
    }

    const result = await queryOrders({
        q: sp.get("q") ?? undefined,
        statuses: statuses as Status[],
        hasToken: sp.get("hasToken") === "1",
        sort: sortRaw ?? undefined,
        page: Number(sp.get("page") ?? 1),
        pageSize: Number(sp.get("pageSize") ?? NaN),
        // Derived from the session role, never trusted from the client, so a
        // runner cannot ask for another runner's queue.
        mine: sp.get("mine") === "1",
        linesHandedOver:
            sp.get("lines") === null ? undefined : sp.get("lines") === "1",
        role: user.role,
        userId: user.id,
    });

    return NextResponse.json(result);
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