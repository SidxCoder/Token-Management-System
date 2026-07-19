import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    if (!can(user.role, "view_audit")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const sp = req.nextUrl.searchParams;

    const pageRaw = Number(sp.get("page") ?? 1);
    const page = Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1;

    const action = sp.get("action")?.trim();
    const username = sp.get("username")?.trim();
    const orderId = sp.get("orderId")?.trim();
    const from = sp.get("from");
    const to = sp.get("to");

    // resolve the business key to the internal uuid the audit rows store
    let orderRefId: string | undefined;
    if (orderId) {
        const order = await prisma.orders.findUnique({
            where: { order_id: orderId },
            select: { id: true },
        });
        if (!order) {
            return NextResponse.json({ entries: [], page: 1, pageSize: PAGE_SIZE, total: 0, totalPages: 0 });
        }
        orderRefId = order.id;
    }

    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    if ((fromDate && isNaN(fromDate.getTime())) || (toDate && isNaN(toDate.getTime()))) {
        return NextResponse.json({ error: "from/to must be valid dates (YYYY-MM-DD)" }, { status: 400 });
    }

    const where = {
        ...(action ? { action } : {}),
        ...(username ? { username: { contains: username, mode: "insensitive" as const } } : {}),
        ...(orderRefId ? { order_ref_id: orderRefId } : {}),
        ...(fromDate || toDate ? { at: { ...(fromDate ? { gte: fromDate } : {}), ...(toDate ? { lte: toDate } : {}) } } : {}),
    };

    const [total, entries] = await Promise.all([
        prisma.audit_Log.count({ where }),
        prisma.audit_Log.findMany({
            where,
            orderBy: { at: "desc" },
            skip: (page - 1) * PAGE_SIZE,
            take: PAGE_SIZE,
            include: { order_ref: { select: { order_id: true } } },
        }),
    ]);

    return NextResponse.json({
        entries,
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
    });
}
