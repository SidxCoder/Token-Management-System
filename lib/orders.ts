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