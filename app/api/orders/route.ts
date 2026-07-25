import { getSessionUser } from "@/lib/auth"
import { prisma } from "@/lib/db";
import { Status } from "@/lib/generated/prisma/enums";
import { can } from "@/lib/permissions";
import { createOrder, WorkflowError } from "@/lib/orders";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 100
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

    const q = sp.get("q")?.trim() ?? "";
    const statusRaw = sp.get("status");

    if(statusRaw && !(statusRaw in Status)){
        return NextResponse.json({
            error: ` invalid status "${statusRaw}"`
        },{
            status: 400
        })
    }

    const where = { 
        ...(statusRaw ? {status: statusRaw as Status} : {}),
        ...(q ? {
            OR: [
                { order_id: { contains: q, mode: "insensitive" as const } },
                { customer_name: { contains: q, mode: "insensitive" as const }},
                { phone: { contains: q, mode: "insensitive" as const }}
            ]
        } : {})
     }


    const [total, orders] = await Promise.all([
        prisma.orders.count({ where }),
        prisma.orders.findMany({
            where,
            orderBy: { uploaded_at: "desc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: { Order_Lines: true},
        })
    ])

    return NextResponse.json({
        orders: orders.map((o)=> ({
            ...o,
            bagged_count: o.Order_Lines.filter((l) => l.bag_number !=null).length,
        })),
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE)
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