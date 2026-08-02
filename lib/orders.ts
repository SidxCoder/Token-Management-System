import { prisma } from "./db";
import { LineStage, Prisma, Role, Status } from "./generated/prisma/client";
import { can } from "./permissions";

export class WorkflowError extends Error {
    constructor(public status: number, message: string) { super(message) }
}
export type Tx = Prisma.TransactionClient;

// Without an explicit order Postgres returns rows in physical order, so editing
// a line moves it to the end of the list — the items visibly reshuffle every
// time a bag number is assigned. Any deterministic order fixes that.
export const LINE_ORDER = [{ product_name: "asc" }, { id: "asc" }] as const;

type StagedLine = { stage: LineStage; bag_number: number | null };

// Orders.status is derived from where the items actually are — items move
// independently, so the order's status is a summary, not a driver.
//
// READY_FOR_PICKUP is deliberately reached only when EVERY outstanding item has
// arrived at the counter: that status is what puts the token on the customer
// display, and calling someone forward for part of their order would have them
// queue twice.
export function recomputeStatus(lines: StagedLine[], hasToken: boolean): Status {
    const live = lines.filter((l) => l.stage !== LineStage.DELIVERED);

    if (live.length === 0) return Status.DELIVERED;
    if (live.every((l) => l.stage === LineStage.AT_COUNTER)) return Status.READY_FOR_PICKUP;
    if (live.some((l) => l.stage === LineStage.WITH_RUNNER)) return Status.HANDOVER;
    if (live.some((l) => l.stage === LineStage.RELEASED)) return Status.TOKEN_ISSUED;
    if (hasToken) return Status.TOKEN_ISSUED;

    return live.every((l) => l.bag_number !== null) ? Status.PACKAGED : Status.PACKAGING_PENDING;
}

// Re-reads the order's lines and writes the derived status back.
async function syncStatus(tx: Tx, orderId: string) {
    const [lines, order] = await Promise.all([
        tx.order_Lines.findMany({ where: { order_ref_id: orderId }, select: { stage: true, bag_number: true } }),
        tx.orders.findUniqueOrThrow({ where: { id: orderId }, select: { token_number: true } }),
    ]);
    return recomputeStatus(lines, order.token_number !== null);
}

export type Actor = {
    id: string;
    username: string;
    role: Role
}
async function loadOrder(tx:Tx, orderId: string) {
    const order = await tx.orders.findUnique({
        where: { order_id: orderId },
        include: { Order_Lines: { orderBy: [...LINE_ORDER] }, Token: true }
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
            include: { Order_Lines: { orderBy: [...LINE_ORDER] } },
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
            include: { Order_Lines: { orderBy: [...LINE_ORDER] }, Token: {where: {status: "ACTIVE"}}}
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
            // ASSIGN — packager or admin.
            //
            // Whether packing is open is a property of the LINE, not of the
            // order: after a partial handover the order moves on while its
            // remaining lines are still sitting in packing. Gating on order
            // status stranded those lines permanently — they could not be
            // bagged, so they could never ship and the order could never be
            // delivered.
            if (!can(user.role, "set_bag_number")) throw new WorkflowError(403, "forbidden");
            if (bagNumber === null) throw new WorkflowError(400, "line has no bag number to clear");
            if (!isAdmin && line.stage !== LineStage.PACKING) {
                throw new WorkflowError(409, "this item has already gone to the runner")
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

        // Bagging can flip PACKAGING_PENDING <-> PACKAGED; the shared derivation
        // handles every other case and never regresses a shipped order.
        const status = await syncStatus(tx, order.id);

        const updated = await tx.orders.update({
            where: { id: order.id},
            data: { status },
            include: { Order_Lines: { orderBy: [...LINE_ORDER] }, Token: {where: { status: "ACTIVE" }}}
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

// Packager step: route the order to a named runner and release the bagged lines
// to them. The status does NOT advance here — the order sits in that runner's
// "ready to collect" list until they physically take it. Unbagged lines stay
// behind in packing, so an order can be partially handed over.
export async function assignRunner(user:Actor, orderId: string, payload: { runnerId?: string } = {}) {
    if(!can(user.role, "hand_to_runner")) throw new WorkflowError(403, "forbidden");

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);

        // A token must exist — the customer is collecting against one. Order
        // status is deliberately not checked: items move independently, so an
        // order can be releasing a second item while a first is at the counter.
        if (order.token_number === null) {
            throw new WorkflowError(409, "issue a token before handing anything over");
        }

        const ready = order.Order_Lines.filter(
            (l) => l.bag_number !== null && l.stage === LineStage.PACKING,
        );
        if (ready.length === 0) {
            const stillPacking = order.Order_Lines.filter((l) => l.stage === LineStage.PACKING).length;
            throw new WorkflowError(
                409,
                stillPacking === 0
                    ? "every item on this order has already been handed over"
                    : `no bagged items to hand over (${stillPacking} still need a bag number)`,
            );
        }

        const runner_id = await resolveTarget(tx, user, Role.RUNNER, payload.runnerId);

        await tx.order_Lines.updateMany({
            where: { id: { in: ready.map((l) => l.id) } },
            data: { stage: LineStage.RELEASED },
        });

        const updated = await tx.orders.update({
            where: { id: order.id},
            data: { runner_id, status: await syncStatus(tx, order.id) },
            include: {Order_Lines: { orderBy: [...LINE_ORDER] }, Token: { where: { status: "ACTIVE" } } }
        });
        const remaining = order.Order_Lines.filter((l) => l.stage === LineStage.PACKING).length - ready.length;
        await logAction(tx, user, "assign_runner", order.id, {
            runner_id, items: ready.length, remaining,
        });
        return updated;
    })
}

// Runner step: the runner physically takes what has been released to them.
export async function handToRunner(user:Actor, orderId: string, payload: { runnerId?: string } = {}) {
    if(!can(user.role, "hand_to_runner")) throw new WorkflowError(403, "forbidden");

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);

        const waiting = order.Order_Lines.filter((l) => l.stage === LineStage.RELEASED);
        if (waiting.length === 0) {
            throw new WorkflowError(409, "nothing is waiting to be collected for this order");
        }

        // An admin collecting on someone's behalf keeps the existing assignment;
        // a runner collecting an unassigned order claims it.
        const runner_id =
            payload.runnerId ?? order.runner_id ??
            (await resolveTarget(tx, user, Role.RUNNER, undefined));

        await tx.order_Lines.updateMany({
            where: { id: { in: waiting.map((l) => l.id) } },
            data: { stage: LineStage.WITH_RUNNER },
        });

        const updated = await tx.orders.update({
            where: { id: order.id},
            data: { runner_id, status: await syncStatus(tx, order.id) },
            include: {Order_Lines: { orderBy: [...LINE_ORDER] }, Token: { where: { status: "ACTIVE" } } }
        });
        await logAction(tx, user, "hand_to_runner", order.id, { runner_id, items: waiting.length });
        return updated;
    })
}

export async function handToCashier(user:Actor, orderId: string, payload: { cashierId?: string } = {}) {
    if(!can(user.role, "hand_to_cashier")) throw new WorkflowError(403, "forbidden");

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);

        // Only what this runner is carrying moves — anything still in packing
        // follows on a later trip.
        const carrying = order.Order_Lines.filter((l) => l.stage === LineStage.WITH_RUNNER);
        if (carrying.length === 0) {
            throw new WorkflowError(409, "this order has no items with the runner");
        }

        const cashier_id = await resolveTarget(tx, user, Role.CASHIER, payload.cashierId);

        await tx.order_Lines.updateMany({
            where: { id: { in: carrying.map((l) => l.id) } },
            data: { stage: LineStage.AT_COUNTER },
        });

        const status = await syncStatus(tx, order.id);

        const updated = await tx.orders.update({
            where: { id: order.id},
            data: {
                status,
                cashier_id,
                // The waiting timer starts when the customer is actually called,
                // which is only once the whole order has reached the counter.
                ...(status === Status.READY_FOR_PICKUP && order.ready_at === null
                    ? { ready_at: new Date() }
                    : {}),
            },
            include: {Order_Lines: { orderBy: [...LINE_ORDER] }, Token: { where: { status: "ACTIVE" } } }
        });
        await logAction(tx, user, "hand_to_cashier", order.id, { cashier_id, items: carrying.length });
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

        // READY_FOR_PICKUP is only reached once every outstanding item is at the
        // counter, so delivering hands over the complete order in one go.
        const batch = order.Order_Lines.filter((l) => l.stage === LineStage.AT_COUNTER);
        if (batch.length === 0) {
            throw new WorkflowError(409, "there is nothing at the counter for this order");
        }

        await tx.order_Lines.updateMany({
            where: { id: { in: batch.map((l) => l.id) } },
            data: { stage: LineStage.DELIVERED },
        });

        const status = await syncStatus(tx, order.id);
        const outstanding = order.Order_Lines.filter(
            (l) => l.stage !== LineStage.DELIVERED && !batch.some((b) => b.id === l.id),
        );

        const updated = await tx.orders.update({
            where: { id: order.id},
            data: outstanding.length === 0
                ? { status }
                : { status, runner_id: null, cashier_id: null, ready_at: null },
            include: {Order_Lines: { orderBy: [...LINE_ORDER] }, Token: { where: { status: "ACTIVE" } } }
        });
        await logAction(tx, user, "deliver", order.id, {
            items: batch.length, outstanding: outstanding.length, to: status,
        });
        return updated;
    })
}


// Cashier step: the customer never collected. Send everything back to packing —
// the token is cancelled (it was called and not answered, so it must not stay on
// the display), the runner/cashier routing is cleared, and every line returns to
// the packing queue so a packager can restock or re-bag it.
export async function returnToPackager(user:Actor, orderId: string, payload: { reason?: string } = {}) {
    if (!can(user.role, "return_order")) throw new WorkflowError(403, "forbidden");

    const reason = (payload.reason ?? "").trim();

    return prisma.$transaction(async (tx) => {
        const order = await loadOrder(tx, orderId);
        if (order.status !== "READY_FOR_PICKUP" && order.status !== "HANDOVER") {
            throw new WorkflowError(409, `cannot return an order that is ${order.status}`);
        }

        const active = order.Token.find((t) => t.status === "ACTIVE");
        if (active) {
            await tx.tokens.update({
                where: { id: active.id },
                data: { status: "CANCELLED", cancelled_by: user.id, cancelled_at: new Date() },
            });
        }

        // Everything that had not yet reached the customer goes back to packing.
        // Already-delivered items stay delivered — a return is about the part
        // that was never collected.
        await tx.order_Lines.updateMany({
            where: { order_ref_id: order.id, stage: { not: LineStage.DELIVERED } },
            data: { stage: LineStage.PACKING },
        });

        const status = await syncStatus(tx, order.id);

        const updated = await tx.orders.update({
            where: { id: order.id },
            data: {
                status,
                token_number: null,
                token_date: null,
                ready_at: null,
                runner_id: null,
                cashier_id: null,
            },
            include: { Order_Lines: { orderBy: [...LINE_ORDER] }, Token: { where: { status: "ACTIVE" } } },
        });
        await logAction(tx, user, "return_order", order.id, {
            from: order.status, to: status, token: active?.id ?? null, reason: reason || null,
        });
        return updated;
    });
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
              include: { Order_Lines: { orderBy: [...LINE_ORDER] }, Token: { where: { status: "ACTIVE" } } },
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
              include: { Order_Lines: { orderBy: [...LINE_ORDER] }, Token: { where: { status: "ACTIVE" } } },
          });
          await logAction(tx, user, "override_status", order.id, { from: order.status, to:
  target });
          return updated;
      });
}