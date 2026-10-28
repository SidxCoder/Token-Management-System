import { prisma } from "@/lib/db";
import type { Employee } from "@/lib/generated/prisma/client";
import { classifyDay, evaluateCycle, incentiveFor } from "./rules";
import { cycleFor, fromDbDate, toDbDate } from "./time";
import type { CycleResult, DayResult } from "./types";

// What the API returns per day, for open (computed) and frozen (snapshot)
// cycles alike.
export type DayView = Pick<
  DayResult,
  | "date"
  | "outcome"
  | "deduction"
  | "severity"
  | "occurrenceNo"
  | "startMin"
  | "endMin"
  | "inMin"
  | "outMin"
  | "lateMinutes"
  | "earlyMinutes"
  | "spanMinutes"
  | "countsAsMissedPunch"
  | "reasons"
>;

export type EmployeeAttendance = {
  employee: Pick<Employee, "id" | "emp_code" | "name" | "gender" | "task">;
  summary: Omit<CycleResult, "days">;
  days: DayView[];
};

/** Start dates of any frozen cycles that the given dates fall into. */
export async function frozenCyclesFor(dates: string[]): Promise<string[]> {
  const starts = [...new Set(dates.map((d) => cycleFor(d).start))];
  const frozen = await prisma.attendance_Cycle.findMany({
    where: { start_date: { in: starts.map(toDbDate) }, status: "FROZEN" },
    select: { start_date: true },
  });
  return frozen.map((c) => fromDbDate(c.start_date));
}

/**
 * Runs the rules engine over every rostered day from `start` to `through`
 * for each employee rostered in that range. `asOf` is today, which decides
 * whether a missed punch is still inside its 48 h window.
 */
export async function computeAttendance(
  start: string,
  through: string,
  asOf: string,
): Promise<{ employee: Employee; result: CycleResult }[]> {
  const range = { gte: toDbDate(start), lte: toDbDate(through) };
  const [employees, shifts, punches, regs] = await Promise.all([
    // Rostered in range, not "active": someone who left mid-cycle still gets judged.
    prisma.employee.findMany({ where: { roster: { some: { date: range } } }, orderBy: { name: "asc" } }),
    prisma.roster_Shift.findMany({ where: { date: range } }),
    prisma.punch.findMany({ where: { date: range } }),
    prisma.regularisation.findMany({ where: { date: range, status: "APPROVED" } }),
  ]);

  const key = (employeeId: string, date: Date) => `${employeeId}|${fromDbDate(date)}`;
  const punchBy = new Map(punches.map((p) => [key(p.employee_id, p.date), p]));
  const regsBy = new Map<string, typeof regs>();
  for (const r of regs) {
    const k = key(r.employee_id, r.date);
    regsBy.set(k, [...(regsBy.get(k) ?? []), r]);
  }

  return employees.map((employee) => {
    const facts = shifts
      .filter((s) => s.employee_id === employee.id)
      .map((s) => {
        const k = key(employee.id, s.date);
        const punch = punchBy.get(k);
        return classifyDay(
          {
            date: fromDbDate(s.date),
            kind: s.kind,
            startMin: s.start_min,
            endMin: s.end_min,
            isOpening: s.is_opening,
          },
          { inMin: punch?.in_min ?? null, outMin: punch?.out_min ?? null },
          (regsBy.get(k) ?? []).map((r) => ({ type: r.type, inMin: r.in_min, outMin: r.out_min })),
        );
      });
    return { employee, result: evaluateCycle(facts, asOf) };
  });
}

function toView(d: DayResult): DayView {
  return {
    date: d.date,
    outcome: d.outcome,
    deduction: d.deduction,
    severity: d.severity,
    occurrenceNo: d.occurrenceNo,
    startMin: d.startMin,
    endMin: d.endMin,
    inMin: d.inMin,
    outMin: d.outMin,
    lateMinutes: d.lateMinutes,
    earlyMinutes: d.earlyMinutes,
    spanMinutes: d.spanMinutes,
    countsAsMissedPunch: d.countsAsMissedPunch,
    reasons: d.reasons,
  };
}

const pickEmployee = (e: Employee): EmployeeAttendance["employee"] => ({
  id: e.id,
  emp_code: e.emp_code,
  name: e.name,
  gender: e.gender,
  task: e.task,
});

/**
 * Attendance for the cycle containing `date`. An open cycle is computed live,
 * through the last day with uploaded punches (so days not yet uploaded don't
 * read as absent). A frozen cycle is read from its snapshot, which is the
 * payroll record even if the rules change later.
 */
export async function attendanceForCycle(date: string, asOf: string) {
  const { start, end } = cycleFor(date);
  const cycle = await prisma.attendance_Cycle.findUnique({ where: { start_date: toDbDate(start) } });

  if (cycle?.status === "FROZEN") {
    const [days, records] = await Promise.all([
      prisma.attendance_Day.findMany({
        where: { cycle_id: cycle.id },
        include: { employee: true },
        orderBy: [{ employee: { name: "asc" } }, { date: "asc" }],
      }),
      prisma.disciplinary_Record.findMany({ where: { cycle_id: cycle.id }, orderBy: { date: "asc" } }),
    ]);

    const byEmployee = new Map<string, EmployeeAttendance>();
    for (const d of days) {
      let entry = byEmployee.get(d.employee_id);
      if (!entry) {
        const disciplinary = records
          .filter((r) => r.employee_id === d.employee_id)
          .map((r) => ({ kind: r.kind, date: fromDbDate(r.date) }));
        entry = {
          employee: pickEmployee(d.employee),
          summary: {
            countedLates: 0,
            excusesUsed: 0,
            missedPunches: 0,
            incentive: incentiveFor(disciplinary.map((r) => r.kind)),
            disciplinary,
          },
          days: [],
        };
        byEmployee.set(d.employee_id, entry);
      }
      if (d.occurrence_no !== null) entry.summary.countedLates++;
      if (d.outcome === "EXCUSED") entry.summary.excusesUsed++;
      if (d.missed_punch) entry.summary.missedPunches++;
      entry.days.push({
        date: fromDbDate(d.date),
        outcome: d.outcome,
        deduction: d.deduction,
        severity: d.severity,
        occurrenceNo: d.occurrence_no,
        startMin: d.start_min,
        endMin: d.end_min,
        inMin: d.in_min,
        outMin: d.out_min,
        lateMinutes: d.late_minutes,
        earlyMinutes: d.early_minutes,
        spanMinutes: d.span_minutes,
        countsAsMissedPunch: d.missed_punch,
        reasons: d.reasons as string[],
      });
    }

    return {
      cycle: { start, end, status: "FROZEN" as const },
      evaluatedThrough: end,
      employees: [...byEmployee.values()],
    };
  }

  const lastPunch = await prisma.punch.aggregate({
    _max: { date: true },
    where: { date: { gte: toDbDate(start), lte: toDbDate(end < asOf ? end : asOf) } },
  });
  const through = lastPunch._max.date ? fromDbDate(lastPunch._max.date) : null;
  const computed = through ? await computeAttendance(start, through, asOf) : [];

  return {
    cycle: { start, end, status: "OPEN" as const },
    evaluatedThrough: through,
    employees: computed.map(({ employee, result: { days, ...summary } }) => ({
      employee: pickEmployee(employee),
      summary,
      days: days.map(toView),
    })),
  };
}
