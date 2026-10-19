import * as XLSX from "xlsx";
import type {
  AttendanceRecord,
  AttendanceStatus,
  Employee,
  EmployeeGender,
  MonthlyEmployeeSummary,
  RosterDay,
  RosterEntry,
} from "./erpTypes";

// Standard shift timing presets recognized by the store SOP
export const STANDARD_SHIFTS: Record<
  string,
  { start: string; end: string; duration: number; isOpening?: boolean }
> = {
  "10:45AM-7:45PM": { start: "10:45", end: "19:45", duration: 9, isOpening: true },
  "10:45AM - 7:45PM": { start: "10:45", end: "19:45", duration: 9, isOpening: true },
  "1-10PM": { start: "13:00", end: "22:00", duration: 9 },
  "1:00PM - 10:00PM": { start: "13:00", end: "22:00", duration: 9 },
  "9:00AM": { start: "09:00", end: "18:00", duration: 9 },
  "9AM-6PM": { start: "09:00", end: "18:00", duration: 9 },
  "9:00AM - 6:00PM": { start: "09:00", end: "18:00", duration: 9 },
  "9:45-6:45": { start: "09:45", end: "18:45", duration: 9 },
  "9:45AM-6:45PM": { start: "09:45", end: "18:45", duration: 9 },
  "12-9PM": { start: "12:00", end: "21:00", duration: 9 },
  "1:30-10:30PM": { start: "13:30", end: "22:30", duration: 9 },
  "10am": { start: "10:00", end: "19:00", duration: 9 },
};

/** Convert time string (e.g. "10:45", "10:45 AM", "13:30", "1:00 PM") to minutes from midnight */
export function timeToMinutes(timeStr: string | null | undefined): number | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toUpperCase();

  // Check 12-hour AM/PM format (e.g. "1:00 PM", "10:45AM", "9:00AM")
  const ampmMatch = clean.match(/^(\d{1,2}):?(\d{2})?\s*(AM|PM)$/);
  if (ampmMatch) {
    let hours = parseInt(ampmMatch[1], 10);
    const mins = ampmMatch[2] ? parseInt(ampmMatch[2], 10) : 0;
    const isPM = ampmMatch[3] === "PM";
    if (isPM && hours < 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  // Check 24-hour format (e.g. "10:45", "19:45", "09:00")
  const h24Match = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (h24Match) {
    const hours = parseInt(h24Match[1], 10);
    const mins = parseInt(h24Match[2], 10);
    return hours * 60 + mins;
  }

  // Check plain hour (e.g. "10AM", "1PM")
  const plainHourMatch = clean.match(/^(\d{1,2})\s*(AM|PM)$/);
  if (plainHourMatch) {
    let hours = parseInt(plainHourMatch[1], 10);
    if (plainHourMatch[2] === "PM" && hours < 12) hours += 12;
    if (plainHourMatch[2] === "AM" && hours === 12) hours = 0;
    return hours * 60;
  }

  return null;
}

/** Formats minutes from midnight into 12-hour AM/PM (e.g. "10:45 AM", "07:45 PM") */
export function minutesToDisplayTime(minutes: number | null): string {
  if (minutes === null || isNaN(minutes)) return "--";
  const norm = ((minutes % 1440) + 1440) % 1440;
  const hours24 = Math.floor(norm / 60);
  const mins = norm % 60;
  const ampm = hours24 >= 12 ? "PM" : "AM";
  const h12 = hours24 % 12 || 12;
  return `${h12}:${mins.toString().padStart(2, "0")} ${ampm}`;
}

/** Resolves scheduled shift boundaries for any shift code/label */
export function resolveShiftTimes(shiftCode: string): { start: string; end: string } {
  const norm = shiftCode.trim();
  if (STANDARD_SHIFTS[norm]) {
    return { start: STANDARD_SHIFTS[norm].start, end: STANDARD_SHIFTS[norm].end };
  }
  // Fallback defaults
  if (norm.toUpperCase().includes("WO") || norm.toUpperCase() === "LEAVE") {
    return { start: "--", end: "--" };
  }
  return { start: "10:45", end: "19:45" };
}

/**
 * Core Rule Engine for calculating daily attendance status according to user & SOP rules:
 *
 * 1. On time or before shift time: PRESENT
 * 2. Late within 30 minutes:
 *    - Up to 3 times in monthly cycle: PRESENT_GRACE_LATE (Pardon applied)
 *    - 4th time late in monthly cycle: HALF_DAY (Grace limit exceeded)
 * 3. Late by > 30 minutes: HALF_DAY
 * 4. Shift completion: Must complete full 9.0 hrs, otherwise HALF_DAY
 * 5. Women safety rule: If female employee shift ends > 21:30, flag transport/consent alert.
 */
export function evaluateAttendance(params: {
  employee: { id: string; name: string; gender: EmployeeGender; role: string };
  date: string;
  scheduledShift: string;
  actualIn: string | null;
  actualOut: string | null;
  monthlyLateCountBeforeThis: number;
  isRegularised?: boolean;
  regularisationNote?: string;
}): AttendanceRecord {
  const {
    employee,
    date,
    scheduledShift,
    actualIn,
    actualOut,
    monthlyLateCountBeforeThis,
    isRegularised,
    regularisationNote,
  } = params;

  const reasons: string[] = [];
  const shiftNorm = scheduledShift.trim().toUpperCase();

  // Check Weekly Off
  if (shiftNorm === "WO" || shiftNorm === "WEEKLY OFF" || shiftNorm === "W/O") {
    return {
      id: `${employee.id}-${date}`,
      employeeId: employee.id,
      employeeName: employee.name,
      gender: employee.gender,
      role: employee.role,
      date,
      scheduledShift: "Weekly Off (WO)",
      scheduledStart: "--",
      scheduledEnd: "--",
      actualIn: null,
      actualOut: null,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      totalHoursWorked: 0,
      monthlyLateCountBeforeThis,
      status: "WEEKLY_OFF",
      statusReasons: ["Scheduled Weekly Off (2 days/week as per SOP-11-02)"],
      isRegularised,
      regularisationNote,
    };
  }

  // Check Leave
  if (shiftNorm === "LEAVE" || shiftNorm.startsWith("LV")) {
    return {
      id: `${employee.id}-${date}`,
      employeeId: employee.id,
      employeeName: employee.name,
      gender: employee.gender,
      role: employee.role,
      date,
      scheduledShift: "Approved Leave",
      scheduledStart: "--",
      scheduledEnd: "--",
      actualIn: null,
      actualOut: null,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      totalHoursWorked: 0,
      monthlyLateCountBeforeThis,
      status: "LEAVE",
      statusReasons: ["Approved leave applied via FRM-01 route"],
      isRegularised,
      regularisationNote,
    };
  }

  const { start: schedStartStr, end: schedEndStr } = resolveShiftTimes(scheduledShift);
  const schedStartMins = timeToMinutes(schedStartStr) ?? 10 * 60 + 45; // default 10:45 AM
  const schedEndMins = timeToMinutes(schedEndStr) ?? 19 * 60 + 45; // default 7:45 PM

  // Check Absent / Missing Punch
  const inMins = timeToMinutes(actualIn);
  const outMins = timeToMinutes(actualOut);

  if (inMins === null && outMins === null) {
    return {
      id: `${employee.id}-${date}`,
      employeeId: employee.id,
      employeeName: employee.name,
      gender: employee.gender,
      role: employee.role,
      date,
      scheduledShift,
      scheduledStart: schedStartStr,
      scheduledEnd: schedEndStr,
      actualIn: null,
      actualOut: null,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      totalHoursWorked: 0,
      monthlyLateCountBeforeThis,
      status: "ABSENT",
      statusReasons: [
        "No biometric punch recorded (Unauthorized absence under SOP-11-02 unless regularised)",
      ],
      isRegularised,
      regularisationNote,
    };
  }

  // If one punch is missing
  if (inMins === null || outMins === null) {
    return {
      id: `${employee.id}-${date}`,
      employeeId: employee.id,
      employeeName: employee.name,
      gender: employee.gender,
      role: employee.role,
      date,
      scheduledShift,
      scheduledStart: schedStartStr,
      scheduledEnd: schedEndStr,
      actualIn,
      actualOut,
      lateMinutes: 0,
      earlyDepartureMinutes: 0,
      totalHoursWorked: 0,
      monthlyLateCountBeforeThis,
      status: isRegularised ? "PRESENT" : "HALF_DAY",
      statusReasons: isRegularised
        ? ["Biometric single punch regularised by Manager"]
        : [
            "Single punch missing (In or Out missing). Pending regularisation under SOP-11-03 within 24h",
          ],
      isRegularised,
      regularisationNote,
    };
  }

  // Calculate Late Minutes
  const lateMinutes = Math.max(0, inMins - schedStartMins);
  // Calculate Early Departure Minutes
  const earlyDepartureMinutes = Math.max(0, schedEndMins - outMins);
  // Calculate Total Hours Worked
  const totalMinutesWorked = Math.max(0, outMins - inMins);
  const totalHoursWorked = parseFloat((totalMinutesWorked / 60).toFixed(2));

  // Check Women Safety Rule (SOP-11-02 Section 7 Rule 5)
  // Shifts for women must end by 21:30 (9:30 PM). 21:30 = 1290 minutes.
  const isWomenSafetyAlert =
    employee.gender === "F" && (schedEndMins > 21 * 60 + 30 || outMins > 21 * 60 + 30);

  // Check conditions
  let status: AttendanceStatus = "PRESENT";
  let isLateOccurrence = false;

  // 1. Punctuality Check
  if (lateMinutes === 0) {
    reasons.push("Reported on-time / before scheduled shift start.");
  } else if (lateMinutes > 0 && lateMinutes <= 30) {
    isLateOccurrence = true;
    if (monthlyLateCountBeforeThis < 3) {
      status = "PRESENT_GRACE_LATE";
      reasons.push(
        `Late by ${lateMinutes} mins (Within 30-min window). Grace pardon applied (${monthlyLateCountBeforeThis + 1}/3 for this month).`,
      );
    } else {
      status = "HALF_DAY";
      reasons.push(
        `Late by ${lateMinutes} mins. 4th late occurrence this month (Exceeded 3-day grace limit -> marked Half Day).`,
      );
    }
  } else {
    // lateMinutes > 30
    status = "HALF_DAY";
    reasons.push(
      `Late arrival by ${lateMinutes} mins (Exceeded maximum 30-minute grace window -> marked Half Day).`,
    );
  }

  // 2. Full 9 Hours Worked Check (Mandatory rule: "complete full 9hrs of shift other will mark half day")
  const requiredShiftHours = 9.0;
  if (totalHoursWorked < requiredShiftHours) {
    status = "HALF_DAY";
    reasons.push(
      `Completed ${totalHoursWorked} hrs (Short of mandatory 9.0-hr shift requirement -> marked Half Day).`,
    );
  } else {
    reasons.push(`Completed full ${totalHoursWorked} hrs (Satisfies 9.0-hr minimum).`);
  }

  // If manually regularised by manager
  if (isRegularised) {
    status = "PRESENT";
    reasons.unshift(
      `[REGULARISED by Operations Manager]: ${regularisationNote || "Approved exception under SOP-11-03"}`,
    );
  }

  if (isWomenSafetyAlert) {
    reasons.push("SOP Rule: Female employee shift ends past 21:30. Store Admin consent & transport required.");
  }

  return {
    id: `${employee.id}-${date}`,
    employeeId: employee.id,
    employeeName: employee.name,
    gender: employee.gender,
    role: employee.role,
    date,
    scheduledShift,
    scheduledStart: schedStartStr,
    scheduledEnd: schedEndStr,
    actualIn,
    actualOut,
    lateMinutes,
    earlyDepartureMinutes,
    totalHoursWorked,
    monthlyLateCountBeforeThis,
    status,
    statusReasons: reasons,
    isWomenSafetyAlert,
    isRegularised,
    regularisationNote,
  };
}

/** Compute aggregate summary statistics for all employees */
export function computeMonthlySummaries(
  employees: Employee[],
  records: AttendanceRecord[],
): MonthlyEmployeeSummary[] {
  return employees.map((emp) => {
    const empRecords = records.filter((r) => r.employeeId === emp.id);

    let daysPresentPunctual = 0;
    let daysGraceLate = 0;
    let daysHalfDay4thLate = 0;
    let daysHalfDayShortHours = 0;
    let totalHalfDays = 0;
    let daysAbsent = 0;
    let daysWeeklyOff = 0;
    let daysLeave = 0;
    let totalHoursWorked = 0;
    let lateOccurrences = 0;

    for (const r of empRecords) {
      totalHoursWorked += r.totalHoursWorked;

      if (r.status === "WEEKLY_OFF") {
        daysWeeklyOff++;
      } else if (r.status === "LEAVE") {
        daysLeave++;
      } else if (r.status === "ABSENT") {
        daysAbsent++;
      } else if (r.status === "PRESENT") {
        daysPresentPunctual++;
      } else if (r.status === "PRESENT_GRACE_LATE") {
        daysGraceLate++;
        lateOccurrences++;
      } else if (r.status === "HALF_DAY") {
        totalHalfDays++;
        if (r.statusReasons.some((reason) => reason.includes("4th late") || reason.includes("grace limit"))) {
          daysHalfDay4thLate++;
          lateOccurrences++;
        }
        if (r.statusReasons.some((reason) => reason.includes("Short of mandatory 9.0-hr"))) {
          daysHalfDayShortHours++;
        }
      }
    }

    const totalRosteredDays = empRecords.filter(
      (r) => r.status !== "WEEKLY_OFF" && r.status !== "LEAVE",
    ).length;

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      gender: emp.gender,
      role: emp.role,
      totalRosteredDays,
      daysPresentPunctual,
      daysGraceLate,
      daysHalfDay4thLate,
      daysHalfDayShortHours,
      totalHalfDays,
      daysAbsent,
      daysWeeklyOff,
      daysLeave,
      totalHoursWorked: parseFloat(totalHoursWorked.toFixed(1)),
      exceededGraceLimit: lateOccurrences >= 4,
    };
  });
}

/** Export Attendance records to an Excel file for download */
export function exportAttendanceExcel(records: AttendanceRecord[], cycleLabel: string) {
  const rows = records.map((r, idx) => ({
    "SR No": idx + 1,
    "Employee Name": r.employeeName,
    Gender: r.gender,
    Role: r.role,
    Date: r.date,
    "Scheduled Shift": r.scheduledShift,
    "Scheduled In": r.scheduledStart,
    "Scheduled Out": r.scheduledEnd,
    "Actual In": r.actualIn ?? "--",
    "Actual Out": r.actualOut ?? "--",
    "Late (Mins)": r.lateMinutes,
    "Hours Worked": r.totalHoursWorked,
    "Status": r.status,
    "Penalty / Notes": r.statusReasons.join(" | "),
    "Women Safety Alert": r.isWomenSafetyAlert ? "YES (Post 21:30)" : "NO",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Daily Attendance");

  const filename = `ERP_Attendance_${cycleLabel.replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/** Export Roster Matrix to an Excel file identical to the store template */
export function exportRosterExcel(
  rosterEntries: RosterEntry[],
  days: RosterDay[],
  cycleLabel: string,
) {
  const rows = rosterEntries.map((entry, idx) => {
    const row: Record<string, string | number> = {
      "SR no.": idx + 1,
      NAME: entry.employeeName,
      Gender: entry.gender,
      "ADD Task": entry.role,
    };

    for (const d of days) {
      row[`${d.label} (${d.dayName})`] = entry.schedule[d.date] || "10:45AM-7:45PM";
    }

    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Weekly Roster");

  const filename = `Store_Roster_${cycleLabel.replace(/\s+/g, "_")}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

/** Download a clean sample Excel template for users to fill and upload */
export function downloadSampleExcelTemplate() {
  const sampleData = [
    {
      "Employee Name": "Adil",
      Gender: "M",
      Role: "Sales Associate",
      Date: "2026-09-28",
      "Scheduled Shift": "10:45AM-7:45PM",
      "Actual In": "10:40 AM",
      "Actual Out": "07:45 PM",
      Notes: "On-time arrival, full 9 hours",
    },
    {
      "Employee Name": "Namrata",
      Gender: "F",
      Role: "Sales Associate",
      Date: "2026-09-28",
      "Scheduled Shift": "10:45AM-7:45PM",
      "Actual In": "11:05 AM",
      "Actual Out": "08:15 PM",
      Notes: "20 mins late (Within 30-min Grace 1/3), completed 9.1 hours",
    },
    {
      "Employee Name": "Rohit",
      Gender: "M",
      Role: "Sales Associate",
      Date: "2026-09-28",
      "Scheduled Shift": "1-10PM",
      "Actual In": "01:25 PM",
      "Actual Out": "09:30 PM",
      Notes: "Short shift: worked 8.1 hrs (< 9 hrs -> Half Day)",
    },
    {
      "Employee Name": "Deepak",
      Gender: "M",
      Role: "Footfall Analysis",
      Date: "2026-09-28",
      "Scheduled Shift": "WO",
      "Actual In": "",
      "Actual Out": "",
      Notes: "Scheduled weekly off",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "ERP_Attendance_Template");
  XLSX.writeFile(wb, "Sample_ERP_Attendance_Upload_Template.xlsx");
}

/** Parses uploaded Excel file buffer into structured attendance data */
export async function parseUploadedExcel(file: File): Promise<{
  records: Array<{
    name: string;
    gender: EmployeeGender;
    role: string;
    date: string;
    scheduledShift: string;
    actualIn: string;
    actualOut: string;
  }>;
  errors: string[];
}> {
  const errors: string[] = [];
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    return { records: [], errors: ["Uploaded spreadsheet has no sheets."] };
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  if (!rawRows || rawRows.length === 0) {
    return { records: [], errors: ["Spreadsheet contains no data rows."] };
  }

  const records: Array<{
    name: string;
    gender: EmployeeGender;
    role: string;
    date: string;
    scheduledShift: string;
    actualIn: string;
    actualOut: string;
  }> = [];

  rawRows.forEach((row, i) => {
    // Flexible header mapping
    const name = String(row["Employee Name"] || row["NAME"] || row["Name"] || "").trim();
    if (!name) return; // Skip empty line

    const genderRaw = String(row["Gender"] || row["GENDER"] || "M").trim().toUpperCase();
    const gender: EmployeeGender = genderRaw === "F" || genderRaw === "FEMALE" ? "F" : "M";

    const role = String(row["Role"] || row["ADD Task"] || row["Role / Task"] || "Associate").trim();
    const date = String(row["Date"] || row["DATE"] || new Date().toISOString().slice(0, 10)).trim();
    const scheduledShift = String(
      row["Scheduled Shift"] || row["Shift"] || row["SHIFT"] || "10:45AM-7:45PM",
    ).trim();

    const actualIn = String(row["Actual In"] || row["In Time"] || row["IN_TIME"] || "").trim();
    const actualOut = String(row["Actual Out"] || row["Out Time"] || row["OUT_TIME"] || "").trim();

    records.push({
      name,
      gender,
      role,
      date,
      scheduledShift,
      actualIn,
      actualOut,
    });
  });

  if (records.length === 0) {
    errors.push("No valid rows could be parsed. Please check column headers (Employee Name, Scheduled Shift, Actual In, Actual Out).");
  }

  return { records, errors };
}
