import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { addDays, daysBetween, fromDbDate, isIsoDate, storeToday, toDbDate } from "@/lib/erp/time";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

const MAX_RANGE_DAYS = 62;

// GET /api/erp/roster?from=YYYY-MM-DD&to=YYYY-MM-DD (defaults: the next 7 days)
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!can(user.role, "view_erp")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const params = req.nextUrl.searchParams;
  const from = params.get("from") ?? storeToday();
  const to = params.get("to") ?? addDays(from, 6);
  if (!isIsoDate(from) || !isIsoDate(to)) {
    return NextResponse.json({ error: "from and to must be YYYY-MM-DD" }, { status: 400 });
  }
  const span = daysBetween(from, to);
  if (span < 0 || span >= MAX_RANGE_DAYS) {
    return NextResponse.json({ error: `range must be 1 to ${MAX_RANGE_DAYS} days` }, { status: 400 });
  }

  const range = { gte: toDbDate(from), lte: toDbDate(to) };
  const employees = await prisma.employee.findMany({
    where: { OR: [{ active: true }, { roster: { some: { date: range } } }] },
    orderBy: { name: "asc" },
    include: { roster: { where: { date: range }, orderBy: { date: "asc" } } },
  });

  return NextResponse.json({
    from,
    to,
    employees: employees.map(({ roster, ...e }) => ({
      id: e.id,
      emp_code: e.emp_code,
      name: e.name,
      gender: e.gender,
      task: e.task,
      active: e.active,
      shifts: roster.map((s) => ({
        date: fromDbDate(s.date),
        kind: s.kind,
        startMin: s.start_min,
        endMin: s.end_min,
        isOpening: s.is_opening,
      })),
    })),
  });
}
