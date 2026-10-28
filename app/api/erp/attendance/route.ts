import { getSessionUser } from "@/lib/auth";
import { attendanceForCycle } from "@/lib/erp/attendance";
import { isIsoDate, storeToday } from "@/lib/erp/time";
import { can } from "@/lib/permissions";
import { NextRequest, NextResponse } from "next/server";

// GET /api/erp/attendance?date=YYYY-MM-DD — the 19th-18th cycle containing
// `date` (default today), one entry per rostered employee.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (!can(user.role, "view_erp")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const today = storeToday();
  const date = req.nextUrl.searchParams.get("date") ?? today;
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }

  return NextResponse.json({ asOf: today, ...(await attendanceForCycle(date, today)) });
}
