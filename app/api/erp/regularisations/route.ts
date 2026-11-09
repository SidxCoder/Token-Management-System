import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { frozenCyclesFor } from "@/lib/erp/attendance";
import { cycleFor, daysBetween, fromDbDate, isIsoDate, parseClock, storeToday, toDbDate } from "@/lib/erp/time";
import { RegularisationStatus, RegularisationType } from "@/lib/generated/prisma/client";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// SOP-11-03 / POL-11-01 limits, enforced when a request is entered.
const MAX_PER_CYCLE: Partial<Record<RegularisationType, number>> = {
  MISSED_PUNCH: 3,
  TIME_EXCEPTION: 3,
};
// Days after the attendance date a request may still be entered:
// 48 h for a missed punch, 24 h for everything else.
const REQUEST_WINDOW_DAYS: Record<RegularisationType, number> = {
  MISSED_PUNCH: 2,
  DEVICE_FAILURE: 1,
  OUTDOOR_DUTY: 1,
  TIME_EXCEPTION: 1,
};
const ACTIVE = [RegularisationStatus.PENDING, RegularisationStatus.APPROVED];

// GET /api/erp/regularisations?status=PENDING&date=YYYY-MM-DD
// Lists one cycle's requests (the cycle containing `date`, default today).
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!can(user.role, "view_erp")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const status = params.get("status") ?? "PENDING";
  const date = params.get("date") ?? storeToday();
  if (!(status in RegularisationStatus)) {
    return NextResponse.json({ error: "status must be PENDING, APPROVED or REJECTED" }, { status: 400 });
  }
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  const { start, end } = cycleFor(date);
  const rows = await prisma.regularisation.findMany({
    where: { status: status as RegularisationStatus, date: { gte: toDbDate(start), lte: toDbDate(end) } },
    orderBy: { requested_at: "desc" },
    include: {
      employee: { select: { emp_code: true, name: true } },
      requester: { select: { display_name: true } },
      decider: { select: { display_name: true } },
    },
  });

  return NextResponse.json({
    cycle: { start, end },
    regularisations: rows.map((r) => ({
      id: r.id,
      employee: r.employee,
      date: fromDbDate(r.date),
      type: r.type,
      inMin: r.in_min,
      outMin: r.out_min,
      note: r.note,
      status: r.status,
      requestedBy: r.requester.display_name,
      requestedAt: r.requested_at,
      decidedBy: r.decider?.display_name ?? null,
      decidedAt: r.decided_at,
      // Whoever entered a request can't decide it.
      canDecide: r.status === "PENDING" && r.requested_by !== user.id && can(user.role, "erp_approve"),
    })),
  });
}

// POST /api/erp/regularisations
// { employeeId, date, type, inTime?, outTime?, note } — times "10:45" or "10:45 AM",
// required for every type except TIME_EXCEPTION.
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!can(user.role, "erp_request")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "body must be JSON" }, { status: 400 });
    }

    const employeeId = String(body.employeeId ?? "");
    const date = String(body.date ?? "");
    const type = String(body.type ?? "") as RegularisationType;
    const note = String(body.note ?? "").trim();
    const today = storeToday();

    if (!(type in RegularisationType)) {
      return NextResponse.json({ error: "unknown regularisation type" }, { status: 400 });
    }
    if (!isIsoDate(date) || date > today) {
      return NextResponse.json({ error: "date must be YYYY-MM-DD and not in the future" }, { status: 400 });
    }
    if (!note) {
      return NextResponse.json({ error: "note is required" }, { status: 400 });
    }
    const window = REQUEST_WINDOW_DAYS[type];
    if (daysBetween(date, today) > window) {
      return NextResponse.json(
        { error: `${type} must be requested within ${window * 24} h of the day` },
        { status: 409 },
      );
    }

    let inMin: number | null = null;
    let outMin: number | null = null;
    if (type !== "TIME_EXCEPTION") {
      const i = typeof body.inTime === "string" ? parseClock(body.inTime) : "invalid";
      const o = typeof body.outTime === "string" ? parseClock(body.outTime) : "invalid";
      if (typeof i !== "number" || typeof o !== "number" || o <= i) {
        return NextResponse.json({ error: "inTime and outTime are required, with out after in" }, { status: 400 });
      }
      inMin = i;
      outMin = o;
    }

    const day = toDbDate(date);
    const [employee, shift, punch] = await Promise.all([
      prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true, name: true } }),
      prisma.roster_Shift.findUnique({ where: { employee_id_date: { employee_id: employeeId, date: day } } }),
      prisma.punch.findUnique({ where: { employee_id_date: { employee_id: employeeId, date: day } } }),
    ]);
    if (!employee) {
      return NextResponse.json({ error: "employee not found" }, { status: 404 });
    }
    if (shift?.kind !== "SHIFT") {
      return NextResponse.json({ error: `${employee.name} has no rostered shift on ${date}` }, { status: 409 });
    }
    if (type === "MISSED_PUNCH" && (!punch || (punch.in_min === null) === (punch.out_min === null))) {
      return NextResponse.json(
        { error: "MISSED_PUNCH needs exactly one recorded punch that day; use DEVICE_FAILURE or OUTDOOR_DUTY otherwise" },
        { status: 409 },
      );
    }
    if ((await frozenCyclesFor([date])).length) {
      return NextResponse.json({ error: "that day's cycle is frozen" }, { status: 409 });
    }

    // One live time-correction and one live time exception per employee-day.
    const isException = type === "TIME_EXCEPTION";
    const clash = await prisma.regularisation.findFirst({
      where: {
        employee_id: employeeId,
        date: day,
        status: { in: ACTIVE },
        type: isException ? "TIME_EXCEPTION" : { not: "TIME_EXCEPTION" },
      },
    });
    if (clash) {
      return NextResponse.json(
        { error: `a ${clash.status.toLowerCase()} ${clash.type} already exists for that day` },
        { status: 409 },
      );
    }

    const cap = MAX_PER_CYCLE[type];
    if (cap !== undefined) {
      const { start, end } = cycleFor(date);
      const used = await prisma.regularisation.count({
        where: {
          employee_id: employeeId,
          type,
          status: { in: ACTIVE },
          date: { gte: toDbDate(start), lte: toDbDate(end) },
        },
      });
      if (used >= cap) {
        return NextResponse.json(
          { error: `${employee.name} already has ${used} ${type} request(s) this cycle (limit ${cap})` },
          { status: 409 },
        );
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const r = await tx.regularisation.create({
        data: {
          employee_id: employeeId,
          date: day,
          type,
          in_min: inMin,
          out_min: outMin,
          note,
          requested_by: user.id,
        },
      });
      await tx.audit_Log.create({
        data: {
          user_id: user.id,
          username: user.username,
          role: user.role,
          action: "erp_request_regularisation",
          details: { id: r.id, employee: employee.name, date, type },
        },
      });
      return r;
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
