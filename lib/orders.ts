import { prisma } from "./db";
import { Prisma, Role, Status } from "./generated/prisma/client";
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

export type NewOrderLineInput = {
    product_name?: string;
    sku_code?: string | null;
    sku_description?: string | null;
    bag_number?: number | string | null;
};
export type NewOrderInput = {
    order_id?: string;
    customer_name?: string;
    phone?: string;
    items?: NewOrderLineInput[];
};

// Manually create a single order (admin-only). Mirrors the Excel import's rules
// so a hand-entered order behaves identically: unique order id, 7-15 digit
// phone, >=1 item, bag numbers free of conflicts with undelivered orders, and
// status derived from whether every line is bagged.
export async function createOrder(user: Actor, input: NewOrderInput) {
    if (!can(user.role, "create_order")) throw new WorkflowError(403, "forbidden");

    const order_id = (input.order_id ?? "").trim();
    const customer_name = (input.customer_name ?? "").trim();
    const phone = (input.phone ?? "").trim();
    const items = Array.isArray(input.items) ? input.items : [];

    if (!order_id) throw new WorkflowError(400, "Order ID is required");
    if (!customer_name) throw new WorkflowError(400, "Customer name is required");
    if (!/^\d{7,15}$/.test(phone)) throw new WorkflowError(400, "Phone number must be 7-15 digits");
    if (items.length === 0) throw new WorkflowError(400, "Add at least one item");

    const lines = items.map((it, i) => {
        const product_name = (it.product_name ?? "").trim();
        if (!product_name) throw new WorkflowError(400, `Item ${i + 1}: product name is required`);

        let bag_number: number | null = null;
        const rawBag = it.bag_number;
        if (rawBag !== null && rawBag !== undefined && String(rawBag).trim() !== "") {
            const n = Number(rawBag);
            if (!Number.isInteger(n) || n < 1) {
                throw new WorkflowError(400, `Item ${i + 1}: bag number must be a positive whole number`);
            }
            bag_number = n;
        }

        return {
            product_name,
            sku_code: (it.sku_code ?? "").toString().trim() || null,
            sku_description: (it.sku_description ?? "").toString().trim() || null,
            bag_number,
        };
    });

    const existing = await prisma.orders.findUnique({ where: { order_id }, select: { id: true } });
    if (existing) throw new WorkflowError(409, `Order ID "${order_id}" already exists`);

    // A bag may repeat within this order, but never one that an undelivered
    // order already holds (delivered orders release theirs).
    const bags = lines.map((l) => l.bag_number).filter((n): n is number => n !== null);
    if (bags.length) {
        const clash = await prisma.order_Lines.findFirst({
            where: { bag_number: { in: bags }, order_ref: { status: { not: "DELIVERED" } } },
            include: { order_ref: { select: { order_id: true } } },
        });
        if (clash) {
            throw new WorkflowError(409, `Bag ${clash.bag_number} is already in use by order "${clash.order_ref.order_id}"`);
        }
    }

    const status = lines.every((l) => l.bag_number !== null) ? Status.PACKAGED : Status.PACKAGING_PENDING;

    return prisma.$transaction(async (tx) => {
        const created = await tx.orders.create({
            data: {
                order_id,
                customer_name,
                phone,
                status,
                number_of_items: lines.length,
                Order_Lines: { create: lines },
            },
            include: { Order_Lines: true },
        });
        await logAction(tx, user, "create_order", created.id, { items: lines.length, source: "manual" });
        return created;
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

// Resolves the person an order is being handed to. Runners may claim an order
// for themselves without naming a target; every other case must name one, so a
// bag is always traceable to a specific station rather than a role.
async function resolveTarget(tx: Tx, actor: Actor, role: Role, targetId?: string) {
    if (!targetId) {
        if (actor.role === role) return actor.id;
        throw new WorkflowError(400, `pick which ${role.toLowerCase()} to hand over to`);
    }

    const target = await tx.user.findUnique({ where: { id: targetId } });
    if (!target || target.role !== role) {
        throw new WorkflowError(400, `"${targetId}" is not a ${role.toLowerCase()}`);
    }
    if (!target.active || target.archived) {
        throw new WorkflowError(409, `${target.display_name} is not available`);
    }
    return target.id;
}

export async function handToRunner(user:Actor, orderId: string, payload: { runnerId?: string } = {}) {
    if(!can(user.role, "hand_to_runner")) throw new WorkflowError(403, "forbidden");

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);
        if( order.status !== "TOKEN_ISSUED") {
            throw new WorkflowError(409, `cannot hand to runner while order is ${order.status}`)
        }

        const unbagged = order.Order_Lines.filter((l)=> l.bag_number == null).length;
        if(unbagged > 0) {
            throw new WorkflowError(409, `${unbagged} of ${order.Order_Lines.length} items have no bag number`)
        }

        const runner_id = await resolveTarget(tx, user, Role.RUNNER, payload.runnerId);

        const updated = await tx.orders.update({
            where: { id: order.id},
            data: {status: "HANDOVER", runner_id},
            include: {Order_Lines: true, Token: { where: { status: "ACTIVE" } } }
        });
        await logAction(tx, user, "hand_to_runner", order.id, { runner_id });
        return updated;
    })
}

export async function handToCashier(user:Actor, orderId: string, payload: { cashierId?: string } = {}) {
    if(!can(user.role, "hand_to_cashier")) throw new WorkflowError(403, "forbidden");

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);
        if( order.status !== "HANDOVER") {
            throw new WorkflowError(409, `cannot hand to cashier while order is ${order.status}`)
        }

        const unbagged = order.Order_Lines.filter((l)=> l.bag_number == null).length;
        if(unbagged > 0) {
            throw new WorkflowError(409, `${unbagged} of ${order.Order_Lines.length} items have no bag number`)
        }

        const cashier_id = await resolveTarget(tx, user, Role.CASHIER, payload.cashierId);

        const updated = await tx.orders.update({
            where: { id: order.id},
            // ready_at starts the customer-facing waiting timer.
            data: {status: "READY_FOR_PICKUP", cashier_id, ready_at: new Date()},
            include: {Order_Lines: true, Token: { where: { status: "ACTIVE" } } }
        });
        await logAction(tx, user, "hand_to_cashier", order.id, { cashier_id });
        return updated;
    })
}

export async function deliver(user:Actor, orderId: string){
    if(!can(user.role, "deliver")) throw new WorkflowError(403, "forbidden");

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);
        if( order.status !== "READY_FOR_PICKUP") {
            throw new WorkflowError(409, `cannot deliver while order is ${order.status}`)
        }

        const unbagged = order.Order_Lines.filter((l)=> l.bag_number == null).length;
        if(unbagged > 0) {
            throw new WorkflowError(409, `${unbagged} of ${order.Order_Lines.length} items have no bag number`)
        }
        const updated = await tx.orders.update({
            where: { id: order.id},
            data: {status: "DELIVERED"},
            include: {Order_Lines: true, Token: { where: { status: "ACTIVE" } } }
        });
        await logAction(tx, user, "deliver", order.id, {});
        return updated;
    })
}


export async function cancelOrder(user:Actor, orderId: string){
    if (!can(user.role, "cancel_token")) throw new WorkflowError(403, "forbidden");

      return prisma.$transaction(async (tx) => {
          const order = await loadOrder(tx, orderId);
          const active = order.Token.find((t) => t.status === "ACTIVE");
          if (!active) throw new WorkflowError(409, "no active token on this order");

          await tx.tokens.update({
              where: { id: active.id },
              data: { status: "CANCELLED", cancelled_by: user.id, cancelled_at: new Date()
  },
          });

          const status = order.Order_Lines.every((l) => l.bag_number !== null)
              ? "PACKAGED" : "PACKAGING_PENDING";

          const updated = await tx.orders.update({
              where: { id: order.id },
              data: { token_number: null, token_date: null, status },
              include: { Order_Lines: true, Token: { where: { status: "ACTIVE" } } },
          });
          await logAction(tx, user, "cancel_token", order.id, { token: active.id });
          return updated;
      });
}

export async function OverrideStatus(user:Actor, orderId: string, payload: { status?: string}){
    if (!can(user.role, "override_status")) throw new WorkflowError(403, "forbidden");
      const target = payload.status;
      if (!target || !(target in Status)) {
          throw new WorkflowError(400, `status must be one of: ${Object.keys(Status).join(",")}`);
      }
      return prisma.$transaction(async (tx) => {
          const order = await loadOrder(tx, orderId);
          const updated = await tx.orders.update({
              where: { id: order.id },
              data: {
                  status: target as Status,
                  // Forcing an order to the counter has to start the waiting
                  // timer too, or the display would show it as 0m forever.
                  ...(target === Status.READY_FOR_PICKUP && order.ready_at === null
                      ? { ready_at: new Date() }
                      : {}),
              },
              include: { Order_Lines: true, Token: { where: { status: "ACTIVE" } } },
          });
          await logAction(tx, user, "override_status", order.id, { from: order.status, to:
  target });
          return updated;
      });
}