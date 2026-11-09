import * as XLSX from "xlsx";
import type { ShiftKind } from "./types";

// Dates are "YYYY-MM-DD" strings everywhere in ERP code. Prisma @db.Date
// columns round-trip them as UTC midnight.
export const toDbDate = (d: string) => new Date(`${d}T00:00:00.000Z`);
export const fromDbDate = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(d: string, n: number): string {
  const date = toDbDate(d);
  date.setUTCDate(date.getUTCDate() + n);
  return fromDbDate(date);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (s: string) => DATE_RE.test(s) && fromDbDate(toDbDate(s)) === s;

// The server may run in UTC; "today" for attendance is the store's day.
export function storeToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

// Attendance cycle runs from the 19th to the 18th of the next month (POL-11-01).
export function cycleFor(date: string): { start: string; end: string } {
  const [y, m, d] = date.split("-").map(Number);
  // Month index of the cycle's start, 0-based; Date.UTC normalises -1 and 12.
  const startMonth = d >= 19 ? m - 1 : m - 2;
  const start = fromDbDate(new Date(Date.UTC(y, startMonth, 19)));
  const end = fromDbDate(new Date(Date.UTC(y, startMonth + 1, 18)));
  return { start, end };
}

// The 10:45 band opens the store.
export const OPENING_START_MIN = 10 * 60 + 45;
const SHIFT_MINUTES = 9 * 60;

/**
 * A punch-time cell: an Excel time (fraction of a day), "10:40 AM", or
 * "19:45". Empty means no punch; "invalid" means the cell can't be read.
 */
export function parseClock(v: unknown): number | null | "invalid" {
  if (typeof v === "number") return Math.round((v % 1) * 1440) % 1440;
  const s = String(v ?? "").trim();
  if (!s || s === "--" || s === "-") return null;
  const m = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (!m) return "invalid";
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (min > 59) return "invalid";
  if (!m[3]) return h < 24 ? h * 60 + min : "invalid";
  if (h < 1 || h > 12) return "invalid";
  return (h % 12) * 60 + min + (m[3].toUpperCase() === "PM" ? 720 : 0);
}

/** A date cell: an Excel date serial or a "YYYY-MM-DD" string. */
export function parseDateCell(v: unknown): string | null {
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    if (!p) return null;
    return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  }
  const s = String(v ?? "").trim();
  return isIsoDate(s) ? s : null;
}

export type RosterCell = {
  kind: ShiftKind;
  startMin: number | null;
  endMin: number | null;
  isOpening: boolean;
};

const OFF_CELLS: Record<string, ShiftKind> = {
  WO: "WEEKLY_OFF",
  "W/O": "WEEKLY_OFF",
  "WEEKLY OFF": "WEEKLY_OFF",
  LEAVE: "LEAVE",
  L: "LEAVE",
  LV: "LEAVE",
  CL: "LEAVE",
  SL: "LEAVE",
  PL: "LEAVE",
  HOLIDAY: "HOLIDAY",
  H: "HOLIDAY",
  PH: "HOLIDAY",
};

/**
 * A roster cell as the store writes it: "WO", "Leave", or a band like
 * "10:45AM-7:45PM", "1-10PM", "9:45-6:45", "9:00AM". Sides without AM/PM
 * are resolved to the reading that gives the shift length closest to 9 h.
 * Empty means no roster entry for that day.
 */
export function parseRosterCell(v: unknown): RosterCell | null | "invalid" {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const off = OFF_CELLS[s.toUpperCase()];
  if (off) return { kind: off, startMin: null, endMin: null, isOpening: false };

  const sides = s.split(/\s*(?:-|–|\bto\b)\s*/i);
  if (sides.length > 2) return "invalid";
  const starts = clockCandidates(sides[0]);
  if (!starts) return "invalid";

  let best: [number, number] | null = null;
  if (sides.length === 1) {
    const start = starts.find((x) => x >= 6 * 60 && x + SHIFT_MINUTES <= 24 * 60);
    if (start !== undefined) best = [start, start + SHIFT_MINUTES];
  } else {
    const ends = clockCandidates(sides[1]);
    if (!ends) return "invalid";
    for (const a of starts) {
      for (const b of ends) {
        const len = b - a;
        if (a < 6 * 60 || len <= 0 || len > 12 * 60) continue;
        if (!best || Math.abs(len - SHIFT_MINUTES) < Math.abs(best[1] - best[0] - SHIFT_MINUTES)) {
          best = [a, b];
        }
      }
    }
  }
  if (!best) return "invalid";
  return { kind: "SHIFT", startMin: best[0], endMin: best[1], isOpening: best[0] === OPENING_START_MIN };
}

// Every reading of one side of a band: "1" could be 01:00 or 13:00.
function clockCandidates(side: string): number[] | null {
  const m = side.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!m) return null;
  const h = Number(m[1]);
  const min = m[2] ? Number(m[2]) : 0;
  if (min > 59) return null;
  if (m[3]) {
    if (h < 1 || h > 12) return null;
    return [(h % 12) * 60 + min + (m[3].toUpperCase() === "PM" ? 720 : 0)];
  }
  if (h > 23) return null;
  if (h >= 12) return [h * 60 + min];
  return [h * 60 + min, (h + 12) * 60 + min];
}
