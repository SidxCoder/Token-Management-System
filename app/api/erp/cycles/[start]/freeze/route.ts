import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeAttendance } from "@/lib/erp/attendance";
import { cycleFor, isIsoDate, storeToday, toDbDate } from "@/lib/erp/time";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// Passed as "today" when freezing: corrections close on the 18th, so every
// missed punch still unresolved at freeze is past its window.
const ALL_WINDOWS_CLOSED = "9999-12-31";

// POST /api/erp/cycles/:start/freeze — :start is the cycle's 19th, YYYY-MM-DD.
// Writes the payroll snapshot and locks the cycle. Cannot be undone.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ start: string }> }) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!can(user.role, "erp_freeze")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const { start } = await params;
    if (!isIsoDate(start) || cycleFor(start).start !== start) {
      return NextResponse.json({ error: "start must be a cycle start date (the 19th), YYYY-MM-DD" }, { status: 400 });
    }
    const { end } = cycleFor(start);
    if (storeToday() <= end) {
      return NextResponse.json({ error: `the cycle runs until ${end}; freeze it from the next day` }, { status: 409 });
    }

    const range = { gte: toDbDate(start), lte: toDbDate(end) };
    const pending = await prisma.regularisation.count({ where: { date: range, status: "PENDING" } });
    if (pending) {
      return NextResponse.json(
        { error: `${pending} regularisation request(s) are still pending; decide them first` },
        { status: 409 },
      );
    }

    const computed = await computeAttendance(start, end, ALL_WINDOWS_CLOSED);

    const frozen = await prisma.$transaction(
      async (tx) => {
        const cycle = await tx.attendance_Cycle.upsert({
          where: { start_date: toDbDate(start) },
          create: { start_date: toDbDate(start), end_date: toDbDate(end) },
          update: {},
        });
        // Conditional on OPEN so a double click can't write the snapshot twice.
        const { count } = await tx.attendance_Cycle.updateMany({
          where: { id: cycle.id, status: "OPEN" },
          data: { status: "FROZEN", frozen_by: user.id, frozen_at: new Date() },
        });
        if (!count) return false;

        await tx.attendance_Day.createMany({
          data: computed.flatMap(({ employee, result }) =>
            result.days.map((d) => ({
              cycle_id: cycle.id,
              employee_id: employee.id,
              date: toDbDate(d.date),
              outcome: d.outcome,
              deduction: d.deduction,
              severity: d.severity,
              occurrence_no: d.occurrenceNo,
              start_min: d.startMin,
              end_min: d.endMin,
              in_min: d.inMin,
              out_min: d.outMin,
              missed_punch: d.countsAsMissedPunch,
              late_minutes: d.lateMinutes,
              early_minutes: d.earlyMinutes,
              span_minutes: d.spanMinutes,
              reasons: d.reasons,
            })),
          ),
        });
        await tx.disciplinary_Record.createMany({
          data: computed.flatMap(({ employee, result }) =>
            result.disciplinary.map((r) => ({
              cycle_id: cycle.id,
              employee_id: employee.id,
              kind: r.kind,
              date: toDbDate(r.date),
            })),
          ),
        });
        await tx.audit_Log.create({
          data: {
            user_id: user.id,
            username: user.username,
            role: user.role,
            action: "erp_freeze_cycle",
            details: { start, end, employees: computed.length },
          },
        });
        return true;
      },
      { timeout: 20000 },
    );
    if (!frozen) {
      return NextResponse.json({ error: "this cycle is already frozen" }, { status: 409 });
    }

    return NextResponse.json({ start, end, employees: computed.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
