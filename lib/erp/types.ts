// Rules-engine types for store attendance (POL-11-01 as adapted for this store).
// Times are minutes from midnight; dates are "YYYY-MM-DD" strings.

export type ShiftKind = "SHIFT" | "WEEKLY_OFF" | "LEAVE" | "HOLIDAY";

export type RosterDay = {
  date: string;
  kind: ShiftKind;
  // Null unless kind is SHIFT.
  startMin: number | null;
  endMin: number | null;
  // The 10:45 band opens the store: any late arrival on it is a major late.
  isOpening: boolean;
};

export type Punch = { inMin: number | null; outMin: number | null };

export type RegularisationType =
  | "MISSED_PUNCH"
  | "DEVICE_FAILURE"
  | "OUTDOOR_DUTY"
  // Manager pre-approved a late arrival or early exit the employee warned them about.
  | "TIME_EXCEPTION";

// Only APPROVED regularisations reach the engine; the caller filters out
// pending and rejected ones.
export type ApprovedRegularisation = {
  type: RegularisationType;
  // Corrected punch times. Null for TIME_EXCEPTION, which carries none.
  inMin: number | null;
  outMin: number | null;
};

export type DayKind =
  | "WORKED"
  | "MISSED_PUNCH"
  | "ABSENT"
  | "WEEKLY_OFF"
  | "LEAVE"
  | "HOLIDAY";

export type HoursBand = "OK" | "UNDER_7H" | "UNDER_4_5H";

// What happened on one day, before any cycle-level rule is applied.
export type DayFacts = {
  date: string;
  kind: DayKind;
  isOpening: boolean;
  startMin: number | null;
  endMin: number | null;
  // Effective punch times: the regularised ones when a correction applies.
  inMin: number | null;
  outMin: number | null;
  lateMinutes: number;
  earlyMinutes: number;
  spanMinutes: number;
  hours: HoursBand;
  timeExceptionApproved: boolean;
  regularisedBy: RegularisationType | null;
  // Raw biometric had exactly one punch. Kept even after regularisation: it
  // still counts toward the missed-punch caution. Device failures don't count.
  countsAsMissedPunch: boolean;
};

export type DayOutcome =
  | "PRESENT"
  | "EXCUSED"
  | "LATE"
  | "HALF_DAY"
  | "FULL_DAY_LEAVE"
  | "MISSED_PUNCH_PENDING"
  | "ABSENT"
  | "WEEKLY_OFF"
  | "LEAVE"
  | "HOLIDAY";

export type Deduction = "NONE" | "HALF_LEAVE" | "FULL_LEAVE" | "UNPAID";

export type DayResult = DayFacts & {
  outcome: DayOutcome;
  severity: "MINOR" | "MAJOR" | null;
  // Position among the cycle's counted lates; null when the day isn't one.
  occurrenceNo: number | null;
  deduction: Deduction;
  reasons: string[];
};

export type DisciplinaryKind =
  | "WARNING_1"
  | "WARNING_2"
  | "SHOW_CAUSE"
  | "MISSED_PUNCH_CAUTION";

export type CycleResult = {
  days: DayResult[];
  countedLates: number;
  excusesUsed: number;
  missedPunches: number;
  incentive: "FULL" | "HALF" | "NONE";
  disciplinary: { kind: DisciplinaryKind; date: string }[];
};
