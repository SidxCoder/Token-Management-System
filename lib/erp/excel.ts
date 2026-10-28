import * as XLSX from "xlsx";
import type { Gender } from "@/lib/generated/prisma/client";
import { parseClock, parseDateCell, parseRosterCell, type RosterCell } from "./time";

export type UploadError = { sheet: string; row: number; message: string };

export type ParsedRosterRow = {
  emp_code: string;
  name: string;
  gender: Gender;
  task: string | null;
  // Only non-empty cells: an empty cell leaves that day's roster untouched.
  shifts: { date: string; cell: RosterCell }[];
};

export type ParsedPunch = {
  emp_code: string;
  date: string;
  in_min: number | null;
  out_min: number | null;
};

export const ROSTER_HEADERS = ["Emp Code", "Name", "Gender", "Task"];
export const PUNCH_HEADERS = ["Emp Code", "Date", "In", "Out"];

type Grid = unknown[][];
const str = (v: unknown) => String(v ?? "").trim();

function firstSheet(buf: Buffer, label: string): { grid: Grid } | { error: UploadError } {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(buf, { type: "buffer" });
  } catch {
    return { error: { sheet: "-", row: 0, message: "File is not a readable .xlsx workbook" } };
  }
  const name = wb.SheetNames[0];
  if (!name) return { error: { sheet: label, row: 0, message: "Workbook has no sheets" } };
  // raw: dates and times stay as Excel serials so they parse exactly.
  const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[name], { header: 1, raw: true, defval: "" });
  return { grid };
}

function checkHeaders(found: unknown[], expected: string[], sheet: string, errors: UploadError[]) {
  expected.forEach((h, i) => {
    if (str(found[i]) !== h) {
      errors.push({ sheet, row: 1, message: `Expected header "${h}" in column ${i + 1}, found "${str(found[i])}"` });
    }
  });
}

function parseGender(v: unknown): Gender | null {
  const g = str(v).toUpperCase();
  if (g === "M" || g === "MALE") return "M";
  if (g === "F" || g === "FEMALE") return "F";
  return null;
}

/**
 * Weekly roster matrix: Emp Code | Name | Gender | Task | one column per date.
 * Date headers are Excel dates or "YYYY-MM-DD"; cells are shift bands or WO/Leave.
 */
export function parseRosterWorkbook(buf: Buffer): { errors: UploadError[]; rows: ParsedRosterRow[] } {
  const sheet = firstSheet(buf, "Roster");
  if ("error" in sheet) return { errors: [sheet.error], rows: [] };
  const [header = [], ...body] = sheet.grid;
  const errors: UploadError[] = [];

  checkHeaders(header, ROSTER_HEADERS, "Roster", errors);
  const dates = header.slice(ROSTER_HEADERS.length).map((h, i) => {
    const d = parseDateCell(h);
    if (!d) {
      errors.push({
        sheet: "Roster",
        row: 1,
        message: `Column ${ROSTER_HEADERS.length + i + 1} header "${str(h)}" is not a date (use YYYY-MM-DD)`,
      });
    }
    return d;
  });
  if (!dates.length) errors.push({ sheet: "Roster", row: 1, message: "No date columns after Task" });
  if (new Set(dates).size !== dates.length) {
    errors.push({ sheet: "Roster", row: 1, message: "The same date appears in more than one column" });
  }
  // Wrong headers make every cell lookup miss; per-cell errors would be noise.
  if (errors.length) return { errors, rows: [] };

  const rows: ParsedRosterRow[] = [];
  const seen = new Set<string>();

  body.forEach((r, i) => {
    const rowNum = i + 2;
    if (r.every((c) => str(c) === "")) return;
    const emp_code = str(r[0]);
    const name = str(r[1]);
    const gender = parseGender(r[2]);
    let ok = true;

    if (!emp_code) {
      errors.push({ sheet: "Roster", row: rowNum, message: "Emp Code is empty" });
      ok = false;
    } else if (seen.has(emp_code)) {
      errors.push({ sheet: "Roster", row: rowNum, message: `Emp Code "${emp_code}" appears twice` });
      ok = false;
    }
    seen.add(emp_code);
    if (!name) {
      errors.push({ sheet: "Roster", row: rowNum, message: "Name is empty" });
      ok = false;
    }
    if (!gender) {
      errors.push({ sheet: "Roster", row: rowNum, message: `Gender "${str(r[2])}" must be M or F` });
      ok = false;
    }

    const shifts: ParsedRosterRow["shifts"] = [];
    dates.forEach((date, j) => {
      const raw = r[ROSTER_HEADERS.length + j];
      const cell = parseRosterCell(raw);
      if (cell === "invalid") {
        errors.push({ sheet: "Roster", row: rowNum, message: `${date}: can't read shift "${str(raw)}"` });
        ok = false;
      } else if (cell) {
        shifts.push({ date: date!, cell });
      }
    });

    if (ok) rows.push({ emp_code, name, gender: gender!, task: str(r[3]) || null, shifts });
  });

  if (!rows.length && !errors.length) errors.push({ sheet: "Roster", row: 0, message: "No employee rows" });
  return { errors, rows };
}

/** Biometric export: Emp Code | Date | In | Out, one row per employee per day. */
export function parsePunchWorkbook(buf: Buffer): { errors: UploadError[]; punches: ParsedPunch[] } {
  const sheet = firstSheet(buf, "Punches");
  if ("error" in sheet) return { errors: [sheet.error], punches: [] };
  const [header = [], ...body] = sheet.grid;
  const errors: UploadError[] = [];

  checkHeaders(header, PUNCH_HEADERS, "Punches", errors);
  if (errors.length) return { errors, punches: [] };

  const punches: ParsedPunch[] = [];
  const seen = new Set<string>();

  body.forEach((r, i) => {
    const rowNum = i + 2;
    if (r.every((c) => str(c) === "")) return;
    const emp_code = str(r[0]);
    const date = parseDateCell(r[1]);
    const in_min = parseClock(r[2]);
    const out_min = parseClock(r[3]);
    let ok = true;

    if (!emp_code) {
      errors.push({ sheet: "Punches", row: rowNum, message: "Emp Code is empty" });
      ok = false;
    }
    if (!date) {
      errors.push({ sheet: "Punches", row: rowNum, message: `Date "${str(r[1])}" is not a date (use YYYY-MM-DD)` });
      ok = false;
    }
    if (in_min === "invalid") {
      errors.push({ sheet: "Punches", row: rowNum, message: `In "${str(r[2])}" is not a time` });
      ok = false;
    }
    if (out_min === "invalid") {
      errors.push({ sheet: "Punches", row: rowNum, message: `Out "${str(r[3])}" is not a time` });
      ok = false;
    }
    const key = `${emp_code}|${date}`;
    if (ok && seen.has(key)) {
      errors.push({ sheet: "Punches", row: rowNum, message: `${emp_code} has two rows for ${date}` });
      ok = false;
    }
    seen.add(key);

    if (ok) {
      punches.push({
        emp_code,
        date: date!,
        in_min: in_min as number | null,
        out_min: out_min as number | null,
      });
    }
  });

  if (!punches.length && !errors.length) errors.push({ sheet: "Punches", row: 0, message: "No punch rows" });
  return { errors, punches };
}
