import type { DayOutcome, Deduction, RegularisationType, ShiftKind } from "@/lib/erp/types";
import { addDays } from "@/lib/erp/time";

// 21:30. Women's regular bands end by then; anything later needs recorded
// consent and store transport (POL-11-01 store rule 5).
export const WOMEN_LATEST_END_MIN = 21 * 60 + 30;

export function clock(min: number | null): string {
  if (min === null) return "--";
  const h = Math.floor(min / 60) % 24;
  return `${h % 12 || 12}:${String(min % 60).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

/** "10:45" style, for prefilling time inputs. */
export function clock24(min: number | null): string {
  if (min === null) return "";
  return `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;
}

export function hm(min: number): string {
  return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, "0")}m`;
}

const KIND_LABEL: Record<Exclude<ShiftKind, "SHIFT">, string> = {
  WEEKLY_OFF: "WO",
  LEAVE: "Leave",
  HOLIDAY: "Holiday",
};

export function shiftLabel(s: { kind: ShiftKind; startMin: number | null; endMin: number | null }): string {
  if (s.kind !== "SHIFT") return KIND_LABEL[s.kind];
  return `${clock(s.startMin)} – ${clock(s.endMin)}`;
}

/** "Mon 28 Sep" */
export function dayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** "19 Sep – 18 Oct 2026" */
export function cycleLabel(start: string, end: string): string {
  const fmt = (d: string, year: boolean) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      ...(year ? { year: "numeric" } : {}),
      timeZone: "UTC",
    });
  return `${fmt(start, false)} – ${fmt(end, true)}`;
}

export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function needsWomenSafety(
  gender: "M" | "F",
  s: { endMin: number | null; outMin?: number | null },
): boolean {
  return gender === "F" && ((s.endMin ?? 0) > WOMEN_LATEST_END_MIN || (s.outMin ?? 0) > WOMEN_LATEST_END_MIN);
}

export const OUTCOME: Record<DayOutcome, { label: string; badge: string }> = {
  PRESENT: { label: "Present", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  EXCUSED: { label: "Excused", badge: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  LATE: { label: "Late", badge: "bg-amber-50 text-amber-700 ring-amber-600/20" },
  HALF_DAY: { label: "Half day", badge: "bg-rose-50 text-rose-700 ring-rose-600/20" },
  FULL_DAY_LEAVE: { label: "Full day leave", badge: "bg-rose-100 text-rose-800 ring-rose-600/30" },
  MISSED_PUNCH_PENDING: { label: "Missed punch", badge: "bg-orange-50 text-orange-700 ring-orange-600/20" },
  ABSENT: { label: "Absent", badge: "bg-red-100 text-red-800 ring-red-600/30" },
  WEEKLY_OFF: { label: "Weekly off", badge: "bg-yellow-100 text-yellow-900 ring-yellow-600/30" },
  LEAVE: { label: "Leave", badge: "bg-purple-50 text-purple-700 ring-purple-600/20" },
  HOLIDAY: { label: "Holiday", badge: "bg-slate-100 text-slate-700 ring-slate-500/20" },
};

export const DEDUCTION_LABEL: Record<Deduction, string | null> = {
  NONE: null,
  HALF_LEAVE: "½ day leave",
  FULL_LEAVE: "1 day leave",
  UNPAID: "1 day unpaid",
};

export const REGULARISATION_LABEL: Record<RegularisationType, string> = {
  MISSED_PUNCH: "Missed punch",
  DEVICE_FAILURE: "Biometric device failure",
  OUTDOOR_DUTY: "Outdoor duty",
  TIME_EXCEPTION: "Late / early with prior notice",
};
