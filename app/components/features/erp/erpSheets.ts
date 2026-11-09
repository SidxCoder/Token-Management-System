import * as XLSX from "xlsx";
import { PUNCH_HEADERS, ROSTER_HEADERS } from "@/lib/erp/excel";
import { addDays } from "@/lib/erp/time";
import type { AttendanceResponse, RosterEmployee } from "./erpApi";
import { clock, clock24, DEDUCTION_LABEL, OUTCOME, shiftLabel } from "./erpFormat";

function save(rows: unknown[][], sheet: string, filename: string) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), sheet);
  XLSX.writeFile(wb, filename);
}

// Roster cells in the form the upload parser reads back: "10:45AM-7:45PM", "WO".
function rosterCell(s: RosterEmployee["shifts"][number] | undefined): string {
  if (!s) return "";
  if (s.kind === "WEEKLY_OFF") return "WO";
  if (s.kind === "LEAVE") return "Leave";
  if (s.kind === "HOLIDAY") return "Holiday";
  const c = (m: number | null) => clock(m).replace(" ", "");
  return `${c(s.startMin)}-${c(s.endMin)}`;
}

export function downloadRosterTemplate(from: string) {
  const dates = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  save(
    [
      [...ROSTER_HEADERS, ...dates],
      ["E001", "Adil", "M", "Sales Associate", "10:45AM-7:45PM", "10:45AM-7:45PM", "WO", "1-10PM", "1-10PM", "1-10PM", "WO"],
      ["E002", "Namrata", "F", "CRM", "12:30-9:30PM", "WO", "12:30-9:30PM", "12:30-9:30PM", "Leave", "WO", "12:30-9:30PM"],
    ],
    "Roster",
    "Roster_Template.xlsx",
  );
}

export function downloadPunchTemplate(date: string) {
  save(
    [
      [...PUNCH_HEADERS],
      ["E001", date, "10:40", "19:50"],
      ["E002", date, "12:35 PM", "9:30 PM"],
    ],
    "Punches",
    "Biometric_Punch_Template.xlsx",
  );
}

/** The week as displayed, in the upload layout so it can be edited and re-uploaded. */
export function exportRoster(employees: RosterEmployee[], dates: string[]) {
  save(
    [
      [...ROSTER_HEADERS, ...dates],
      ...employees.map((e) => {
        const byDate = new Map(e.shifts.map((s) => [s.date, s]));
        return [e.emp_code, e.name, e.gender, e.task ?? "", ...dates.map((d) => rosterCell(byDate.get(d)))];
      }),
    ],
    "Roster",
    `Roster_${dates[0]}_to_${dates.at(-1)}.xlsx`,
  );
}

export function exportCycleAttendance(data: AttendanceResponse) {
  const header = [
    "Emp Code", "Name", "Gender", "Task", "Date", "Shift", "In", "Out", "Late (min)", "Early (min)",
    "Hours", "Outcome", "Deduction", "Counted Late #", "Severity", "Reasons",
  ];
  const rows = data.employees.flatMap(({ employee: e, days }) =>
    days.map((d) => [
      e.emp_code, e.name, e.gender, e.task ?? "", d.date,
      d.startMin === null ? OUTCOME[d.outcome].label : shiftLabel({ kind: "SHIFT", startMin: d.startMin, endMin: d.endMin }),
      clock24(d.inMin), clock24(d.outMin), d.lateMinutes, d.earlyMinutes, +(d.spanMinutes / 60).toFixed(2),
      OUTCOME[d.outcome].label, DEDUCTION_LABEL[d.deduction] ?? "", d.occurrenceNo ?? "", d.severity ?? "",
      d.reasons.join(" | "),
    ]),
  );
  save([header, ...rows], "Attendance", `Attendance_${data.cycle.start}_to_${data.cycle.end}.xlsx`);
}
