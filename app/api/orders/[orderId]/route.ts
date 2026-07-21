import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest,{ params }: { params: Promise<{ orderId: string}>}){

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

    const { orderId } = await params;

    const order = await prisma.orders.findUnique({
        where: { order_id: orderId },
        include: {
            Order_Lines: true,
            Token: { include: { issuer: { select: { username: true, display_name: true }}}}
        }
    })

    if(!order) return NextResponse.json({
        error: `order "${orderId}" not found`
    },{
        status: 404
    })

    const audit = await prisma.audit_Log.findMany({
        where: { order_ref_id: order.id },
        orderBy: { at: "desc"},
        take: 20
    })


    return NextResponse.json({
        ...order,
        bagged_count: order.Order_Lines.filter((l) => l.bag_number !== null).length,
        audit,
    })
}