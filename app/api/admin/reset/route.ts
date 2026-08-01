import { getSessionUser, invalidateAllSessions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Role } from "@/lib/generated/prisma/client";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// The two phrases the caller must type. Checked here as well as in the UI, so
// the endpoint cannot be triggered by a stray request or a mis-click that
// somehow bypasses the dialog.
//
// Match is case-sensitive: holding shift for six letters is cheap, and it makes
// the confirmation a deliberate act rather than muscle memory.
const STEP_ONE = "DELETE";
const STEP_TWO = "CONFIRM";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (!can(user.role, "reset_data")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  // Surrounding whitespace is forgiven; capitalisation is not.
  const first = String(body?.first ?? "").trim();
  const second = String(body?.second ?? "").trim();

  if (first !== STEP_ONE || second !== STEP_TWO) {
    return NextResponse.json(
      { error: `both confirmations are required: type "${STEP_ONE}" then "${STEP_TWO}"` },
      { status: 400 },
    );
  }

  const before = {
    orders: await prisma.orders.count(),
    tokens: await prisma.tokens.count(),
    users: await prisma.user.count({ where: { role: { not: Role.ADMIN } } }),
  };

  // Order matters: Audit_Log.user_id and Tokens.issued_by are ON DELETE
  // RESTRICT, so those tables have to be empty before any account can go.
  // Sessions is deliberately NOT truncated — deleting the non-admin accounts
  // cascades theirs away, and leaving admin sessions alone means whoever ran
  // the reset stays signed in instead of being bounced to the login screen.
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE "Audit_Log", "Tokens", "Order_Lines", "Orders" RESTART IDENTITY CASCADE`,
  );

  const removed = await prisma.user.deleteMany({ where: { role: { not: Role.ADMIN } } });

  // Cached sessions may still point at accounts that no longer exist.
  invalidateAllSessions();

  // Written after the truncate so the reset itself is the first entry in the
  // fresh audit log rather than being wiped by its own operation.
  await prisma.audit_Log.create({
    data: {
      user_id: user.id,
      username: user.username,
      role: user.role,
      action: "reset_data",
      details: {
        orders_removed: before.orders,
        tokens_removed: before.tokens,
        accounts_removed: removed.count,
      },
    },
  });

  return NextResponse.json({
    ok: true,
    orders_removed: before.orders,
    tokens_removed: before.tokens,
    accounts_removed: removed.count,
  });
}
