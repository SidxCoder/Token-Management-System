import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";


export async function GET(){
    const orders = await prisma.orders.findMany({
        where: { status: "READY_FOR_PICKUP" },
        orderBy: { updated_at: "desc" },
        select: { token_number: true, order_id: true}
    })

    return NextResponse.json(
        orders.map((o) => ({
            token: o.token_number,
            order: o.order_id.slice(0,-3) + "***"
        }))
    )
}