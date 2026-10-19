export type ShiftBand = {
  id: string;
  name: string; // e.g. "10:45AM-7:45PM", "1:00PM-10:00PM", "9:00AM-6:00PM"
  startTime: string; // "10:45" (24h)
  endTime: string; // "19:45" (24h)
  durationHours: number; // 9
  isStoreOpening?: boolean;
};

export type EmployeeGender = "M" | "F";

export type EmployeeRoleCategory =
  | "Sales Associate"
  | "Specialist / Lead"
  | "Store Management"
  | "Customer Service"
  | "CRM"
  | "Cashier"
  | "Temp Staff"
  | "Backend";

export type Employee = {
  id: string;
  name: string;
  gender: EmployeeGender;
  role: string; // e.g. "Footfall Analysis", "Trainer", "Duty Manager", "CRM"
  category: EmployeeRoleCategory;
  defaultShift: string;
};

export type AttendanceStatus =
  | "PRESENT"
  | "PRESENT_GRACE_LATE"
  | "HALF_DAY"
  | "ABSENT"
  | "WEEKLY_OFF"
  | "LEAVE";

export type AttendanceRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  gender: EmployeeGender;
  role: string;
  date: string; // "YYYY-MM-DD"
  scheduledShift: string; // e.g. "10:45AM - 7:45PM" or "WO" or "Leave"
  scheduledStart: string; // "10:45"
  scheduledEnd: string; // "19:45"
  actualIn: string | null; // "10:50" or null if absent/WO
  actualOut: string | null; // "19:50" or null
  lateMinutes: number;
  earlyDepartureMinutes: number;
  totalHoursWorked: number;
  monthlyLateCountBeforeThis: number; // Late occurrences (<= 30 mins) earlier in the 19th-18th cycle
  status: AttendanceStatus;
  statusReasons: string[]; // e.g. ["Within 30-min late window (Grace 2 of 3 used)", "Completed full 9 hours"]
  isWomenSafetyAlert?: boolean; // Ends after 21:30 for female employee
  isRegularised?: boolean;
  regularisationNote?: string;
};

export type RosterDay = {
  date: string; // "2026-09-28"
  dayName: string; // "MON"
  label: string; // "28th Sept"
};

export type RosterEntry = {
  employeeId: string;
  employeeName: string;
  gender: EmployeeGender;
  role: string;
  category: EmployeeRoleCategory;
  schedule: Record<string, string>; // date -> shift string e.g. "10:45AM-7:45PM", "WO", "Leave"
};

export type MonthlyEmployeeSummary = {
  employeeId: string;
  employeeName: string;
  gender: EmployeeGender;
  role: string;
  totalRosteredDays: number;
  daysPresentPunctual: number;
  daysGraceLate: number;
  daysHalfDay4thLate: number;
  daysHalfDayShortHours: number;
  totalHalfDays: number;
  daysAbsent: number;
  daysWeeklyOff: number;
  daysLeave: number;
  totalHoursWorked: number;
  exceededGraceLimit: boolean; // Had 4 or more late days
};
