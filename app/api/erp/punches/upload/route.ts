import { randomUUID } from "crypto";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { frozenCyclesFor } from "@/lib/erp/attendance";
import { parsePunchWorkbook } from "@/lib/erp/excel";
import { storeToday, toDbDate } from "@/lib/erp/time";
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

    const { errors, punches } = parsePunchWorkbook(Buffer.from(await file.arrayBuffer()));

    // Employees come from the roster upload; a punch for an unknown code is
    // almost always a typo or a missing roster, and both need fixing first.
    const codes = [...new Set(punches.map((p) => p.emp_code))];
    const employees = await prisma.employee.findMany({
      where: { emp_code: { in: codes } },
      select: { id: true, emp_code: true },
    });
    const idByCode = new Map(employees.map((e) => [e.emp_code, e.id]));
    for (const code of codes) {
      if (!idByCode.has(code)) {
        errors.push({ sheet: "Punches", row: 0, message: `Emp Code "${code}" is not on any roster` });
      }
    }

    const today = storeToday();
    const future = punches.filter((p) => p.date > today);
    if (future.length) {
      errors.push({ sheet: "Punches", row: 0, message: `${future.length} row(s) are dated after today (${today})` });
    }

    const dates = [...new Set(punches.map((p) => p.date))];
    for (const start of await frozenCyclesFor(dates)) {
      errors.push({ sheet: "Punches", row: 0, message: `The cycle starting ${start} is frozen and can't be changed` });
    }
    if (errors.length) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const batchId = randomUUID();
    const data = punches.map((p) => ({
      employee_id: idByCode.get(p.emp_code)!,
      date: toDbDate(p.date),
      in_min: p.in_min,
      out_min: p.out_min,
      upload_batch_id: batchId,
    }));

    await prisma.$transaction(
      async (tx) => {
        // A re-export from the device replaces that employee-day's reading.
        // Regularisations live in their own table, so none are lost.
        await tx.punch.deleteMany({
          where: { OR: data.map((d) => ({ employee_id: d.employee_id, date: d.date })) },
        });
        await tx.punch.createMany({ data });
        await tx.audit_Log.create({
          data: {
            user_id: user.id,
            username: user.username,
            role: user.role,
            action: "erp_upload_punches",
            details: { batch: batchId, rows: data.length, from: dates.sort()[0], to: dates.at(-1) },
          },
        });
      },
      { timeout: 20000 },
    );

    return NextResponse.json({ rows: data.length, batch: batchId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected upload failure";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
