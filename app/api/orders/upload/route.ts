import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { parseOrdersWorkbook, type ParsedOrder } from "@/lib/excel";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req:NextRequest){
    const user = await getSessionUser();
    if(!user) return NextResponse.json({ error: "unauthenticated"}, { status: 401 })
    if(!can(user.role, "upload_excel")) return NextResponse.json({
        error: "forbidden"
    },{
        status: 403
    })

    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "file is required" }, {
        status: 400
    })

    const {errors, orders} = parseOrdersWorkbook(Buffer.from(await file.arrayBuffer()))

    if(orders.length) {
        const exisitng = await prisma.orders.findMany({
            where: {order_id: {in:orders.map((o) => o.order_id) }},
            select: { order_id: true}
        })
        for (const e of exisitng){
            errors.push({sheet: "Orders", row: 0, message: `ORDER ID "${e.order_id}" already exists`})
        }

        // Bag uniqueness vs the DB: bags of undelivered orders are taken;
        // delivered orders have released theirs.
        const bags = orders.flatMap((o) => o.items.map((i) => i.bag_number))
            .filter((n): n is number => n !== null)
        if (bags.length) {
            const clashes = await prisma.order_Lines.findMany({
                where: { bag_number: { in: bags }, order_ref: { status: { not: "DELIVERED" } } },
                include: { order_ref: { select: { order_id: true } } },
            })
            for (const c of clashes) {
                errors.push({
                    sheet: "Items", row: 0,
                    message: `Bag Number ${c.bag_number} is already in use by existing order "${c.order_ref.order_id}"`,
                })
            }
        }
    }
    if(errors.length) return NextResponse.json({errors}, {status: 400})

    const totalItems = orders.reduce((n, o) => n + o.items.length, 0)
    // A line with a bag number IS packed (project decision: packed == bagged).
    const fullyBagged = (o: ParsedOrder) => o.items.every((i) => i.bag_number !== null)

    await prisma.$transaction(async (tx) => {
        for (const o of orders) {
            await tx.orders.create({
                data: {
                    order_id: o.order_id,
                    customer_name: o.customer_name,
                    phone: o.phone,
                    status: fullyBagged(o) ? "PACKAGED" : "PACKAGING_PENDING",
                    number_of_items: o.items.length,
                    Order_Lines: { create: o.items },
                },
            })
        }
        await tx.audit_Log.create({
            data: {
                user_id: user.id,
                username: user.username,
                role: user.role,
                action: "upload_orders",
                details: { orders: orders.length, items: totalItems },
            },
        })
    })

    return NextResponse.json({
        orders: orders.length,
        items: totalItems,
        prePacked: orders.filter(fullyBagged).length,
    })
}