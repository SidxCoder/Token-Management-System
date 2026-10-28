import type {
  ApprovedRegularisation,
  CycleResult,
  DayFacts,
  DayOutcome,
  DayResult,
  Deduction,
  DisciplinaryKind,
  Punch,
  RosterDay,
} from "./types";

// Thresholds from POL-11-01 as adapted for this store. If HR revises a
// number, this is the only place to change it.
export const MAJOR_LATE_MINUTES = 30;
export const HALF_DAY_SPAN_MINUTES = 7 * 60;
export const FULL_DAY_SPAN_MINUTES = 4.5 * 60;
export const HALF_DAY_EVERY_NTH_LATE = 3;
export const WARNING_EVERY_NTH_LATE = 3;
export const MAX_EXCUSES_PER_CYCLE = 3;
export const MISSED_PUNCH_CAUTION_AT = 3;
export const MISSED_PUNCH_WINDOW_DAYS = 2; // 48 h to regularise

const WARNING_LADDER = ["WARNING_1", "WARNING_2", "SHOW_CAUSE"] as const;

/** Measures one day against its rostered shift. Applies no penalties. */
export function classifyDay(
  roster: RosterDay,
  raw: Punch,
  regs: ApprovedRegularisation[],
): DayFacts {
  const timeExceptionApproved = regs.some((r) => r.type === "TIME_EXCEPTION");
  // At most one punch correction per day; TIME_EXCEPTION carries no times.
  const fix = regs.find((r) => r.type !== "TIME_EXCEPTION") ?? null;
  const rawMissed = (raw.inMin === null) !== (raw.outMin === null);

  const base = {
    date: roster.date,
    isOpening: roster.isOpening,
    startMin: roster.startMin,
    endMin: roster.endMin,
    inMin: null,
    outMin: null,
    timeExceptionApproved,
    regularisedBy: fix?.type ?? null,
    countsAsMissedPunch: rawMissed && fix?.type !== "DEVICE_FAILURE",
    lateMinutes: 0,
    earlyMinutes: 0,
    spanMinutes: 0,
    hours: "OK" as const,
  };

  if (roster.kind !== "SHIFT") {
    // Work on an off day is comp-off / overtime (SOP-11-05), handled separately.
    return { ...base, kind: roster.kind, countsAsMissedPunch: false };
  }
  if (roster.startMin === null || roster.endMin === null) {
    throw new Error(`Shift on ${roster.date} has no start/end time`);
  }

  // A regularisation replaces the biometric times, but lateness is still
  // judged on the corrected times: it fixes the record, it doesn't pardon.
  const inMin = fix ? fix.inMin : raw.inMin;
  const outMin = fix ? fix.outMin : raw.outMin;
  if (inMin === null && outMin === null) return { ...base, kind: "ABSENT" };
  if (inMin === null || outMin === null) return { ...base, kind: "MISSED_PUNCH", inMin, outMin };

  const spanMinutes = Math.max(0, outMin - inMin);
  return {
    ...base,
    kind: "WORKED",
    inMin,
    outMin,
    lateMinutes: Math.max(0, inMin - roster.startMin),
    earlyMinutes: Math.max(0, roster.endMin - outMin),
    spanMinutes,
    hours:
      spanMinutes < FULL_DAY_SPAN_MINUTES
        ? "UNDER_4_5H"
        : spanMinutes < HALF_DAY_SPAN_MINUTES
          ? "UNDER_7H"
          : "OK",
  };
}

/**
 * Applies the cycle rules to one employee's days. Pass only dates up to
 * `asOf`: a day with no punch uploaded yet would otherwise read as absent.
 */
export function evaluateCycle(facts: DayFacts[], asOf: string): CycleResult {
  // Order matters: the 3rd late is only the 3rd in date order.
  const sorted = [...facts].sort((a, b) => a.date.localeCompare(b.date));
  let countedLates = 0;
  let excusesUsed = 0;
  let missedPunches = 0;
  const disciplinary: CycleResult["disciplinary"] = [];

  const days = sorted.map((f): DayResult => {
    const result = (
      outcome: DayOutcome,
      deduction: Deduction,
      reasons: string[],
      severity: DayResult["severity"] = null,
      occurrenceNo: number | null = null,
    ): DayResult => ({ ...f, outcome, deduction, reasons, severity, occurrenceNo });

    if (f.countsAsMissedPunch) {
      missedPunches++;
      if (missedPunches === MISSED_PUNCH_CAUTION_AT) {
        disciplinary.push({ kind: "MISSED_PUNCH_CAUTION", date: f.date });
      }
    }

    switch (f.kind) {
      case "WEEKLY_OFF":
        return result("WEEKLY_OFF", "NONE", []);
      case "LEAVE":
        return result("LEAVE", "NONE", []);
      case "HOLIDAY":
        return result("HOLIDAY", "NONE", []);
      case "ABSENT":
        return result("ABSENT", "UNPAID", ["No punch and no approved leave: unauthorised absence."]);
      case "MISSED_PUNCH":
        return daysBetween(f.date, asOf) > MISSED_PUNCH_WINDOW_DAYS
          ? result("ABSENT", "UNPAID", ["Missed punch not regularised within 48 h: unauthorised absence."])
          : result("MISSED_PUNCH_PENDING", "NONE", ["One punch missing; regularise within 48 h."]);
    }

    // Short hours take precedence, and the late is not counted that day
    // (store decision).
    const offBy = f.lateMinutes + f.earlyMinutes;
    const offNote = offBy > 0 ? [`${describe(f)}: not counted as a late on a short-hours day.`] : [];
    if (f.hours === "UNDER_4_5H") {
      return result("FULL_DAY_LEAVE", "FULL_LEAVE", [`Worked ${hm(f.spanMinutes)} (under 4.5 h): one day's leave.`, ...offNote]);
    }
    if (f.hours === "UNDER_7H") {
      return result("HALF_DAY", "HALF_LEAVE", [`Worked ${hm(f.spanMinutes)} (under 7 h): half-day leave.`, ...offNote]);
    }
    if (offBy === 0) return result("PRESENT", "NONE", []);

    const openingLate = f.isOpening && f.lateMinutes > 0;
    const major = openingLate || offBy > MAJOR_LATE_MINUTES;

    if (!major && f.timeExceptionApproved && excusesUsed < MAX_EXCUSES_PER_CYCLE) {
      excusesUsed++;
      return result("EXCUSED", "NONE", [`${describe(f)}: manager-approved exception ${excusesUsed}/${MAX_EXCUSES_PER_CYCLE}.`], "MINOR");
    }

    countedLates++;
    const reasons = [`${describe(f)}: counted late #${countedLates}.`];
    const nthHalfDay = countedLates % HALF_DAY_EVERY_NTH_LATE === 0;

    if (countedLates % WARNING_EVERY_NTH_LATE === 0) {
      const step = Math.min(countedLates / WARNING_EVERY_NTH_LATE, WARNING_LADDER.length);
      const kind = WARNING_LADDER[step - 1];
      disciplinary.push({ kind, date: f.date });
      reasons.push(`${kind} issued.`);
    }

    if (openingLate) reasons.push("Late on the opening shift: half day.");
    else if (major) reasons.push(`More than ${MAJOR_LATE_MINUTES} min outside shift: half day.`);
    else if (nthHalfDay) reasons.push(`Every ${HALF_DAY_EVERY_NTH_LATE}rd counted late: half day.`);

    const halfDay = major || nthHalfDay;
    return result(
      halfDay ? "HALF_DAY" : "LATE",
      halfDay ? "HALF_LEAVE" : "NONE",
      reasons,
      major ? "MAJOR" : "MINOR",
      countedLates,
    );
  });

  return {
    days,
    countedLates,
    excusesUsed,
    missedPunches,
    incentive: incentiveFor(disciplinary.map((d) => d.kind)),
    disciplinary,
  };
}

/** Sales incentive for a cycle, from the disciplinary steps issued in it. */
export function incentiveFor(issued: DisciplinaryKind[]): CycleResult["incentive"] {
  if (issued.includes("SHOW_CAUSE")) return "NONE";
  if (issued.includes("WARNING_2")) return "HALF";
  return "FULL";
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function hm(minutes: number): string {
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, "0")}m`;
}

function describe(f: DayFacts): string {
  const parts: string[] = [];
  if (f.lateMinutes > 0) parts.push(`${f.lateMinutes} min late`);
  if (f.earlyMinutes > 0) parts.push(`left ${f.earlyMinutes} min early`);
  return parts.join(", ");
}
