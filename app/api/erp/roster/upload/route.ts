import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { frozenCyclesFor } from "@/lib/erp/attendance";
import { parseRosterWorkbook } from "@/lib/erp/excel";
import { toDbDate } from "@/lib/erp/time";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
    }
    if (!can(user.role, "erp_upload")) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }

    const file = (await req.formData()).get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const { errors, rows } = parseRosterWorkbook(Buffer.from(await file.arrayBuffer()));
    const dates = [...new Set(rows.flatMap((r) => r.shifts.map((s) => s.date)))];

    for (const start of await frozenCyclesFor(dates)) {
      errors.push({ sheet: "Roster", row: 0, message: `The cycle starting ${start} is frozen and can't be changed` });
    }
    if (errors.length) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const shiftCount = rows.reduce((n, r) => n + r.shifts.length, 0);

    await prisma.$transaction(
      async (tx) => {
        // The sheet is the source for each employee's details and for every
        // non-empty cell; empty cells leave existing roster days as they are.
        const ids = new Map<string, string>();
        for (const r of rows) {
          const e = await tx.employee.upsert({
            where: { emp_code: r.emp_code },
            create: { emp_code: r.emp_code, name: r.name, gender: r.gender, task: r.task },
            update: { name: r.name, gender: r.gender, task: r.task, active: true },
            select: { id: true },
          });
          ids.set(r.emp_code, e.id);
        }

        const cells = rows.flatMap((r) =>
          r.shifts.map((s) => ({
            employee_id: ids.get(r.emp_code)!,
            date: toDbDate(s.date),
            kind: s.cell.kind,
            start_min: s.cell.startMin,
            end_min: s.cell.endMin,
            is_opening: s.cell.isOpening,
          })),
        );
        await tx.roster_Shift.deleteMany({
          where: { OR: cells.map((c) => ({ employee_id: c.employee_id, date: c.date })) },
        });
        await tx.roster_Shift.createMany({ data: cells });

        await tx.audit_Log.create({
          data: {
            user_id: user.id,
            username: user.username,
            role: user.role,
            action: "erp_upload_roster",
            details: { employees: rows.length, shifts: shiftCount, from: dates.sort()[0], to: dates.at(-1) },
          },
        });
      },
      { timeout: 20000 },
    );

    return NextResponse.json({ employees: rows.length, shifts: shiftCount });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upload failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
