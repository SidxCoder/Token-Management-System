import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { NextResponse } from "next/server";

export async function GET() {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    if (!can(user.role, "view_reports")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [byStatus, issuedToday, cancelledToday, deliveredToday] = await Promise.all([
        prisma.orders.groupBy({ by: ["status"], _count: { _all: true } }),
        prisma.tokens.count({ where: { issued_date: { gte: startOfToday } } }),
        prisma.tokens.count({ where: { cancelled_at: { gte: startOfToday } } }),
        // "delivered today" is an EVENT count, so it comes from the audit log —
        // order status only says where an order is now, not when it got there.
        prisma.audit_Log.count({ where: { action: "deliver", at: { gte: startOfToday } } }),
    ]);

    return NextResponse.json({
        byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count._all])),
        tokens: { issuedToday, cancelledToday },
        deliveredToday,
    });
}
