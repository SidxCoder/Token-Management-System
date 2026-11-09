import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { frozenCyclesFor } from "@/lib/erp/attendance";
import { fromDbDate } from "@/lib/erp/time";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// PATCH /api/erp/regularisations/:id  { decision: "APPROVE" | "REJECT" }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!can(user.role, "erp_approve")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { id } = await params;
    let decision: unknown;
    try {
      decision = (await req.json())?.decision;
    } catch {
      return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
    }
    if (decision !== "APPROVE" && decision !== "REJECT") {
      return NextResponse.json({ error: 'decision must be "APPROVE" or "REJECT"' }, { status: 400 });
    }

    const reg = await prisma.regularisation.findUnique({
      where: { id },
      include: { employee: { select: { name: true } } },
    });
    if (!reg) {
      return NextResponse.json({ error: "regularisation not found" }, { status: 404 });
    }
    // With only one admin role, this is the one check that a second person
    // looked at the exception.
    if (reg.requested_by === user.id) {
      return NextResponse.json({ error: "you can't decide a request you entered" }, { status: 403 });
    }
    const date = fromDbDate(reg.date);
    if ((await frozenCyclesFor([date])).length) {
      return NextResponse.json({ error: "that day's cycle is frozen" }, { status: 409 });
    }

    const status = decision === "APPROVE" ? "APPROVED" : "REJECTED";
    const decided = await prisma.$transaction(async (tx) => {
      // Conditional on PENDING so two admins deciding at once can't both win.
      const { count } = await tx.regularisation.updateMany({
        where: { id, status: "PENDING" },
        data: { status, decided_by: user.id, decided_at: new Date() },
      });
      if (!count) return false;
      await tx.audit_Log.create({
        data: {
          user_id: user.id,
          username: user.username,
          role: user.role,
          action: "erp_decide_regularisation",
          details: { id, employee: reg.employee.name, date, type: reg.type, status },
        },
      });
      return true;
    });
    if (!decided) {
      return NextResponse.json({ error: "this request has already been decided" }, { status: 409 });
    }

    return NextResponse.json({ id, status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
