import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";


export async function GET(){
    const orders = await prisma.orders.findMany({
        where: { status: "READY_FOR_PICKUP" },
        orderBy: { updated_at: "desc" },
        select: {
            token_number: true,
            order_id: true,
            ready_at: true,
            updated_at: true,
            // Which counter to walk to. Public screen, so only the station
            // number and display name are exposed — never the account.
            cashier: { select: { display_name: true, station_number: true } },
        }
    })

    return NextResponse.json(
        orders.map((o) => ({
            token: o.token_number,
            order: o.order_id.slice(0,-3) + "***",
            // Orders that reached READY_FOR_PICKUP before ready_at existed have
            // no stamp; updated_at is the closest stand-in for those.
            readyAt: (o.ready_at ?? o.updated_at).toISOString(),
            counter: o.cashier
                ? (o.cashier.station_number != null
                    ? `Counter ${o.cashier.station_number}`
                    : o.cashier.display_name)
                : null,
        }))
    )
}