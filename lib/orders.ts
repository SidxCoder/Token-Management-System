import { prisma } from "./db";
import { Prisma, Role } from "./generated/prisma/client";
import { can } from "./permissions";

export class WorkflowError extends Error {
    constructor(public status: number, message: string) { super(message) }
}
export type Tx = Prisma.TransactionClient;

export type Actor = {
    id: string;
    username: string;
    role: Role
}
async function loadOrder(tx:Tx, orderId: string) {
    const order = await tx.orders.findUnique({
        where: { order_id: orderId },
        include: { Order_Lines: true, Token: true }
    })

    if (!order) throw new WorkflowError(404, `order "${orderId}" not found`);
    return order;
}

function logAction(tx:Tx, user: Actor, action: string, orderRefId: string | null, details?: object) {
    return tx.audit_Log.create({
        data: {
            user_id: user.id, username: user.username, role: user.role,
            action, order_ref_id: orderRefId, details: details ?? {},
        }
    });
}

export async function issueToken(user: Actor, orderId: string){
    if(!can(user.role, "issue_token")) throw new WorkflowError(403, "forbidden");


    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);

        if (order.status != "PACKAGING_PENDING" && order.status != "PACKAGED") {
            throw new WorkflowError(409, `cannot issue token while order is ${order.status}`)
        }

        const active = order.Token.find((t) => t.status === "ACTIVE");

        if(active) throw new WorkflowError(409, `token ${active.id} is already active for this order`);

        const token = await tx.tokens.create({
            data: { order_ref_id: order.id, issued_by: user.id, status: "ACTIVE"}
        })

        const updated = await tx.orders.update({
            where: {id: order.id},
            data: { token_number: token.id, token_date: new Date(), status: "TOKEN_ISSUED"},
            include: { Order_Lines: true, Token: {where: {status: "ACTIVE"}}}
        });

        await logAction(tx, user, "issue_token", order.id, {
            token: token.id,
            previously_cancelled: order.Token.length,
        });

        return updated;

    })
}


export async function setBagNumber(user: Actor, orderId: string, payload: {lineId?: string; bagNumber?: number | null}){
    const { lineId, bagNumber } = payload;
    if(!lineId) throw new WorkflowError(400, "lineId is required");

    if (bagNumber === undefined || (bagNumber !== null && (!Number.isInteger(bagNumber) || bagNumber < 1))) {
        throw new WorkflowError(400, "bagNumber must be a positive integer, or null to clear")
    }

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);
        const line = order.Order_Lines.find((l) => l.id === lineId);

        if(!line) throw new WorkflowError(404, `line "${lineId}" not found on order "${orderId}"`);

        const isAdmin = user.role === "ADMIN"

        if(line.bag_number === null) {
            // ASSIGN — packager or admin; non-admins only while packing is still open
            // (TOKEN_ISSUED included: customer may arrive before packing is finished)
            if (!can(user.role, "set_bag_number")) throw new WorkflowError(403, "forbidden");
            if (bagNumber === null) throw new WorkflowError(400, "line has no bag number to clear");
            if (!isAdmin && order.status !== "PACKAGING_PENDING" && order.status !== "PACKAGED" && order.status !== "TOKEN_ISSUED"){
                throw new WorkflowError(409, `packing is closed (order is ${order.status})`)
            }
        } else {
            // HARD LOCK — once assigned, only admin may change or clear, any stage
            if (!isAdmin) {
                throw new WorkflowError(403, "bag number already assigned - only admin can change or remove it")
            }
        }

        // Bag uniqueness: same bag may repeat within one order, but never across
        // two undelivered orders. Delivered orders release their bag numbers.
        if (bagNumber !== null) {
            const conflict = await tx.order_Lines.findFirst({
                where: {
                    bag_number: bagNumber,
                    order_ref_id: { not: order.id },
                    order_ref: { status: { not: "DELIVERED" } },
                },
                include: { order_ref: { select: { order_id: true } } },
            });
            if (conflict) {
                throw new WorkflowError(409, `bag ${bagNumber} is already in use by order "${conflict.order_ref.order_id}"`);
            }
        }

        await tx.order_Lines.update({
            where: {id: line.id},
            data: {bag_number: bagNumber}
        });

        // Recompute status from lines — only while in the two packing stages,
        // so a bag change never regresses TOKEN_ISSUED or later.
        let status = order.status;
        if(order.status === "PACKAGING_PENDING" || order.status === "PACKAGED") {
            const lines = await tx.order_Lines.findMany({
                where: {order_ref_id: order.id}
            })
            status = lines.every((l) => l.bag_number !== null) ? "PACKAGED" : "PACKAGING_PENDING";
        }

        const updated = await tx.orders.update({
            where: { id: order.id},
            data: { status },
            include: { Order_Lines: true, Token: {where: { status: "ACTIVE" }}}
        })

        await logAction(tx, user, "set_bag_number", order.id, {
            line: line.id, sku: line.sku_code, old: line.bag_number, new: bagNumber
        })

        return updated;
    })
}