import type { Employee, RosterDay, RosterEntry } from "./erpTypes";

export const SAMPLE_DAYS: RosterDay[] = [
  { date: "2026-09-28", dayName: "MON", label: "28th Sept" },
  { date: "2026-09-29", dayName: "TUE", label: "29th Sept" },
  { date: "2026-09-30", dayName: "WED", label: "30th Sept" },
  { date: "2026-10-01", dayName: "THU", label: "1st Oct" },
  { date: "2026-10-02", dayName: "FRI", label: "2nd Oct" },
  { date: "2026-10-03", dayName: "SAT", label: "3rd Oct" },
  { date: "2026-10-04", dayName: "SUN", label: "4th Oct" },
];

export const SAMPLE_EMPLOYEES: Employee[] = [
  // Sales Associates
  { id: "EMP-01", name: "Adil", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-02", name: "Deepak", gender: "M", role: "Footfall Analysis", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-03", name: "Sanjay", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "1-10PM" },
  { id: "EMP-04", name: "Namrata", gender: "F", role: "Sales Associate", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-05", name: "Omkar", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "1-10PM" },
  { id: "EMP-06", name: "Mustafa", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "1-10PM" },
  { id: "EMP-07", name: "Rohit", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "1-10PM" },
  { id: "EMP-08", name: "Abir", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-09", name: "Ansuman", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "1-10PM" },
  { id: "EMP-10", name: "Pooja", gender: "F", role: "Notice Board SPOC", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-11", name: "Fazil", gender: "M", role: "Sales Associate", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-12", name: "Pragya", gender: "F", role: "Sales Associate", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-13", name: "Samreen", gender: "F", role: "Sales Associate", category: "Sales Associate", defaultShift: "10:45AM-7:45PM" },

  // Specialists
  { id: "EMP-14", name: "Charleston", gender: "M", role: "Trainer", category: "Specialist / Lead", defaultShift: "1-10PM" },
  { id: "EMP-15", name: "Faheem", gender: "M", role: "SR.Sp", category: "Specialist / Lead", defaultShift: "1-10PM" },

  // Store Management
  { id: "EMP-16", name: "Ankita", gender: "F", role: "Duty Manager (DM)", category: "Store Management", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-17", name: "Bhavesh", gender: "M", role: "Operations Head (OH)", category: "Store Management", defaultShift: "1-10PM" },
  { id: "EMP-18", name: "Allan", gender: "M", role: "Operations Manager (OM)", category: "Store Management", defaultShift: "1-10PM" },

  // Customer Service
  { id: "EMP-19", name: "Sunita", gender: "F", role: "Customer Service", category: "Customer Service", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-20", name: "Krishna", gender: "M", role: "Customer Service", category: "Customer Service", defaultShift: "1-10PM" },
  { id: "EMP-21", name: "Riyaz", gender: "M", role: "Customer Service (DM)", category: "Customer Service", defaultShift: "1-10PM" },

  // CRM
  { id: "EMP-22", name: "Royston", gender: "M", role: "CRM Specialist", category: "CRM", defaultShift: "9:45-6:45" },
  { id: "EMP-23", name: "Shalaka", gender: "F", role: "CRM Specialist", category: "CRM", defaultShift: "9:45-6:45" },
  { id: "EMP-24", name: "Neha", gender: "F", role: "CRM Specialist", category: "CRM", defaultShift: "Leave" },

  // Cashier
  { id: "EMP-25", name: "Sageer", gender: "M", role: "Lead Cashier", category: "Cashier", defaultShift: "1-10PM" },

  // Temp Staff
  { id: "EMP-26", name: "Prathamesh", gender: "M", role: "Store Greeter", category: "Temp Staff", defaultShift: "1-10PM" },
  { id: "EMP-27", name: "Aamena", gender: "F", role: "CRM Temp", category: "Temp Staff", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-28", name: "Arya", gender: "M", role: "CRM Temp", category: "Temp Staff", defaultShift: "10:45AM-7:45PM" },
  { id: "EMP-29", name: "Bhoomika", gender: "F", role: "CRM Temp", category: "Temp Staff", defaultShift: "1-10PM" },

  // Backend
  { id: "EMP-30", name: "Michael", gender: "M", role: "IT Support", category: "Backend", defaultShift: "9AM-6PM" },
  { id: "EMP-31", name: "Vikas", gender: "M", role: "Visual Merchandiser (VM)", category: "Backend", defaultShift: "10am" },
];

// Roster schedule mapped directly from the user's Excel spreadsheet (Image 3)
export const SAMPLE_ROSTER_ENTRIES: RosterEntry[] = [
  {
    employeeId: "EMP-01",
    employeeName: "Adil",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "WO",
      "2026-09-29": "WO",
      "2026-09-30": "1-10PM",
      "2026-10-01": "1-10PM",
      "2026-10-02": "1-10PM",
      "2026-10-03": "10:45AM-7:45PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-02",
    employeeName: "Deepak",
    gender: "M",
    role: "Footfall Analysis",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "WO",
      "2026-09-29": "1-10PM",
      "2026-09-30": "WO",
      "2026-10-01": "1-10PM",
      "2026-10-02": "10:45AM-7:45PM",
      "2026-10-03": "1-10PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-03",
    employeeName: "Sanjay",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "WO",
      "2026-09-29": "1-10PM",
      "2026-09-30": "WO",
      "2026-10-01": "1-10PM",
      "2026-10-02": "1-10PM",
      "2026-10-03": "1-10PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-04",
    employeeName: "Namrata",
    gender: "F",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "WO",
      "2026-09-29": "WO",
      "2026-09-30": "1-10PM",
      "2026-10-01": "1-10PM",
      "2026-10-02": "1-10PM",
      "2026-10-03": "1-10PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-05",
    employeeName: "Omkar",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "1-10PM",
      "2026-09-30": "WO",
      "2026-10-01": "WO",
      "2026-10-02": "1-10PM",
      "2026-10-03": "9:00AM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-06",
    employeeName: "Mustafa",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "1-10PM",
      "2026-09-30": "1-10PM",
      "2026-10-01": "1-10PM",
      "2026-10-02": "WO",
      "2026-10-03": "WO",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-07",
    employeeName: "Rohit",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "1-10PM",
      "2026-09-30": "1-10PM",
      "2026-10-01": "1-10PM",
      "2026-10-02": "1-10PM",
      "2026-10-03": "1-10PM",
      "2026-10-04": "WO",
    },
  },
  {
    employeeId: "EMP-08",
    employeeName: "Abir",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "10:45AM-7:45PM",
      "2026-09-30": "1-10PM",
      "2026-10-01": "10:45AM-7:45PM",
      "2026-10-02": "WO",
      "2026-10-03": "WO",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-09",
    employeeName: "Ansuman",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "1-10PM",
      "2026-09-30": "1-10PM",
      "2026-10-01": "WO",
      "2026-10-02": "1-10PM",
      "2026-10-03": "1-10PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-10",
    employeeName: "Pooja",
    gender: "F",
    role: "Notice Board SPOC",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "10:45AM-7:45PM",
      "2026-09-29": "10:45AM-7:45PM",
      "2026-09-30": "10:45AM-7:45PM",
      "2026-10-01": "10:45AM-7:45PM",
      "2026-10-02": "WO",
      "2026-10-03": "10:45AM-7:45PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-11",
    employeeName: "Fazil",
    gender: "M",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "10:45AM-7:45PM",
      "2026-09-29": "10:45AM-7:45PM",
      "2026-09-30": "10:45AM-7:45PM",
      "2026-10-01": "10:45AM-7:45PM",
      "2026-10-02": "10:45AM-7:45PM",
      "2026-10-03": "WO",
      "2026-10-04": "WO",
    },
  },
  {
    employeeId: "EMP-12",
    employeeName: "Pragya",
    gender: "F",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "WO",
      "2026-09-30": "WO",
      "2026-10-01": "10:45AM-7:45PM",
      "2026-10-02": "10:45AM-7:45PM",
      "2026-10-03": "10:45AM-7:45PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-13",
    employeeName: "Samreen",
    gender: "F",
    role: "Sales Associate",
    category: "Sales Associate",
    schedule: {
      "2026-09-28": "10:45AM-7:45PM",
      "2026-09-29": "10:45AM-7:45PM",
      "2026-09-30": "10:45AM-7:45PM",
      "2026-10-01": "WO",
      "2026-10-02": "WO",
      "2026-10-03": "1-10PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-16",
    employeeName: "Ankita",
    gender: "F",
    role: "Duty Manager (DM)",
    category: "Store Management",
    schedule: {
      "2026-09-28": "10:45AM-7:45PM",
      "2026-09-29": "WO",
      "2026-09-30": "10:45AM-7:45PM",
      "2026-10-01": "WO",
      "2026-10-02": "10:45AM-7:45PM",
      "2026-10-03": "10:45AM-7:45PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-17",
    employeeName: "Bhavesh",
    gender: "M",
    role: "Operations Head (OH)",
    category: "Store Management",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "1-10PM",
      "2026-09-30": "WO",
      "2026-10-01": "WO",
      "2026-10-02": "1-10PM",
      "2026-10-03": "1-10PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-18",
    employeeName: "Allan",
    gender: "M",
    role: "Operations Manager (OM)",
    category: "Store Management",
    schedule: {
      "2026-09-28": "1-10PM",
      "2026-09-29": "WO",
      "2026-09-30": "WO",
      "2026-10-01": "1-10PM",
      "2026-10-02": "1-10PM",
      "2026-10-03": "1-10PM",
      "2026-10-04": "9:00AM",
    },
  },
  {
    employeeId: "EMP-24",
    employeeName: "Neha",
    gender: "F",
    role: "CRM Specialist",
    category: "CRM",
    schedule: {
      "2026-09-28": "Leave",
      "2026-09-29": "Leave",
      "2026-09-30": "Leave",
      "2026-10-01": "Leave",
      "2026-10-02": "WO",
      "2026-10-03": "Leave",
      "2026-10-04": "Leave",
    },
  },
];

/**
 * Pre-seeded realistic biometric punches demonstrating:
 * 1. On time arrival + full 9 hrs -> PRESENT
 * 2. Late within 30 mins (Grace 1, 2, 3) -> PRESENT_GRACE_LATE
 * 3. 4th late occurrence -> HALF_DAY
 * 4. Late by > 30 minutes -> HALF_DAY
 * 5. Worked < 9.0 hours -> HALF_DAY
 * 6. Female employee shift ending past 21:30 -> Safety alert badge
 * 7. Scheduled WO & Leave
 */
export const SAMPLE_PUNCH_LOGS: Array<{
  employeeId: string;
  date: string;
  actualIn: string | null;
  actualOut: string | null;
  monthlyLateCountBeforeThis: number; // Late occurrences in cycle prior to this record
}> = [
  // Adil - Scheduled WO on 28th
  { employeeId: "EMP-01", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 0 },
  // Deepak - Scheduled WO on 28th
  { employeeId: "EMP-02", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 1 },
  // Sanjay - Scheduled WO on 28th
  { employeeId: "EMP-03", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 0 },
  // Namrata - Scheduled WO on 28th
  { employeeId: "EMP-04", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 0 },

  // Omkar - Scheduled 1-10PM (13:00 - 22:00).
  // Arrived 12:55 PM (on time), left 10:02 PM. Worked 9.1 hrs -> PRESENT
  { employeeId: "EMP-05", date: "2026-09-28", actualIn: "12:55 PM", actualOut: "10:02 PM", monthlyLateCountBeforeThis: 0 },

  // Mustafa - Scheduled 1-10PM (13:00 - 22:00).
  // Arrived 1:18 PM (18 mins late, <= 30 mins, 1st late in month). Left 10:20 PM. Total = 9.03 hrs -> PRESENT_GRACE_LATE (Grace 1/3)
  { employeeId: "EMP-06", date: "2026-09-28", actualIn: "01:18 PM", actualOut: "10:20 PM", monthlyLateCountBeforeThis: 0 },

  // Rohit - Scheduled 1-10PM (13:00 - 22:00).
  // Arrived 1:12 PM (12 mins late, <= 30 mins). BUT has already had 3 late arrivals earlier this month!
  // monthlyLateCountBeforeThis = 3 -> This is the 4th LATE -> Automatically marked HALF DAY!
  { employeeId: "EMP-07", date: "2026-09-28", actualIn: "01:12 PM", actualOut: "10:15 PM", monthlyLateCountBeforeThis: 3 },

  // Abir - Scheduled 1-10PM (13:00 - 22:00).
  // Arrived 1:45 PM (45 mins late -> exceeds 30-min window). Left 10:45 PM. Worked 9 hrs but late >30m -> HALF DAY
  { employeeId: "EMP-08", date: "2026-09-28", actualIn: "01:45 PM", actualOut: "10:45 PM", monthlyLateCountBeforeThis: 1 },

  // Ansuman - Scheduled 1-10PM (13:00 - 22:00).
  // Arrived 1:00 PM on time. BUT left early at 9:15 PM! Total hours = 8.25 hrs (< 9.0 hrs) -> HALF DAY
  { employeeId: "EMP-09", date: "2026-09-28", actualIn: "01:00 PM", actualOut: "09:15 PM", monthlyLateCountBeforeThis: 0 },

  // Pooja - Scheduled 10:45AM-7:45PM (10:45 - 19:45).
  // Arrived 10:40 AM on time, left 07:50 PM. Full 9.17 hrs -> PRESENT
  { employeeId: "EMP-10", date: "2026-09-28", actualIn: "10:40 AM", actualOut: "07:50 PM", monthlyLateCountBeforeThis: 0 },

  // Fazil - Scheduled 10:45AM-7:45PM (10:45 - 19:45).
  // Arrived 11:02 AM (17 mins late, <= 30 mins). Monthly late count = 1 -> PRESENT_GRACE_LATE (Grace 2/3). Left 8:05 PM (9.05 hrs).
  { employeeId: "EMP-11", date: "2026-09-28", actualIn: "11:02 AM", actualOut: "08:05 PM", monthlyLateCountBeforeThis: 1 },

  // Pragya - Scheduled 1-10PM (Female employee ending at 22:00 > 21:30!).
  // Arrived 1:00 PM, left 10:00 PM -> PRESENT with Women Safety Alert (Consent & Store Cab Required)
  { employeeId: "EMP-12", date: "2026-09-28", actualIn: "01:00 PM", actualOut: "10:00 PM", monthlyLateCountBeforeThis: 0 },

  // Samreen - Scheduled 10:45AM-7:45PM.
  // Arrived 10:45 AM, left 07:45 PM -> PRESENT (Full 9.0 hrs)
  { employeeId: "EMP-13", date: "2026-09-28", actualIn: "10:45 AM", actualOut: "07:45 PM", monthlyLateCountBeforeThis: 0 },

  // Charleston (Trainer) - Scheduled 1-10PM.
  // Arrived 12:50 PM, left 10:00 PM -> PRESENT
  { employeeId: "EMP-14", date: "2026-09-28", actualIn: "12:50 PM", actualOut: "10:00 PM", monthlyLateCountBeforeThis: 0 },

  // Faheem (SR.Sp) - Scheduled 1-10PM.
  // Arrived 01:22 PM (22 mins late, <= 30 mins, 2nd late in cycle). Left 10:25 PM. -> PRESENT_GRACE_LATE
  { employeeId: "EMP-15", date: "2026-09-28", actualIn: "01:22 PM", actualOut: "10:25 PM", monthlyLateCountBeforeThis: 2 },

  // Ankita (DM) - Scheduled 10:45AM-7:45PM.
  // Arrived 10:40 AM, left 08:00 PM -> PRESENT
  { employeeId: "EMP-16", date: "2026-09-28", actualIn: "10:40 AM", actualOut: "08:00 PM", monthlyLateCountBeforeThis: 0 },

  // Bhavesh (OH) - Scheduled 1-10PM.
  // Arrived 12:45 PM, left 10:15 PM -> PRESENT
  { employeeId: "EMP-17", date: "2026-09-28", actualIn: "12:45 PM", actualOut: "10:15 PM", monthlyLateCountBeforeThis: 0 },

  // Allan (OM) - Scheduled 1-10PM.
  // Arrived 01:00 PM, left 10:00 PM -> PRESENT
  { employeeId: "EMP-18", date: "2026-09-28", actualIn: "01:00 PM", actualOut: "10:00 PM", monthlyLateCountBeforeThis: 0 },

  // Sunita (CS) - Scheduled WO on 28th
  { employeeId: "EMP-19", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 0 },

  // Krishna (CS) - Scheduled 10:45AM-7:45PM.
  // Arrived 10:42 AM, left 07:46 PM -> PRESENT
  { employeeId: "EMP-20", date: "2026-09-28", actualIn: "10:42 AM", actualOut: "07:46 PM", monthlyLateCountBeforeThis: 0 },

  // Riyaz (CS DM) - Scheduled 1-10PM.
  // Arrived 01:00 PM, left 10:00 PM -> PRESENT
  { employeeId: "EMP-21", date: "2026-09-28", actualIn: "01:00 PM", actualOut: "10:00 PM", monthlyLateCountBeforeThis: 0 },

  // Royston (CRM) - Scheduled 9:45-6:45.
  // Arrived 09:40 AM, left 06:45 PM -> PRESENT
  { employeeId: "EMP-22", date: "2026-09-28", actualIn: "09:40 AM", actualOut: "06:45 PM", monthlyLateCountBeforeThis: 0 },

  // Shalaka (CRM) - Scheduled 1-10PM.
  // Arrived 01:00 PM, left 10:00 PM -> PRESENT (Women Safety Alert: Ends > 21:30)
  { employeeId: "EMP-23", date: "2026-09-28", actualIn: "01:00 PM", actualOut: "10:00 PM", monthlyLateCountBeforeThis: 0 },

  // Neha (CRM) - Scheduled Leave on 28th
  { employeeId: "EMP-24", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 0 },

  // Sageer (Cashier) - Scheduled 1-10PM.
  // Arrived 01:00 PM, left 10:00 PM -> PRESENT
  { employeeId: "EMP-25", date: "2026-09-28", actualIn: "01:00 PM", actualOut: "10:00 PM", monthlyLateCountBeforeThis: 0 },

  // Prathamesh (Greeter) - Scheduled WO on 28th
  { employeeId: "EMP-26", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 0 },

  // Aamena (Temp) - Scheduled WO on 28th
  { employeeId: "EMP-27", date: "2026-09-28", actualIn: null, actualOut: null, monthlyLateCountBeforeThis: 0 },

  // Arya (Temp) - Scheduled 10:45AM-7:45PM.
  // Arrived 10:45 AM, left 07:45 PM -> PRESENT
  { employeeId: "EMP-28", date: "2026-09-28", actualIn: "10:45 AM", actualOut: "07:45 PM", monthlyLateCountBeforeThis: 0 },

  // Bhoomika (Temp) - Scheduled 1-10PM.
  // Arrived 01:00 PM, left 10:00 PM -> PRESENT (Women Safety Alert: Ends > 21:30)
  { employeeId: "EMP-29", date: "2026-09-28", actualIn: "01:00 PM", actualOut: "10:00 PM", monthlyLateCountBeforeThis: 0 },

  // Michael (IT) - Scheduled 9AM-6PM.
  // Arrived 09:00 AM, left 06:00 PM -> PRESENT
  { employeeId: "EMP-30", date: "2026-09-28", actualIn: "09:00 AM", actualOut: "06:00 PM", monthlyLateCountBeforeThis: 0 },

  // Vikas (VM) - Scheduled 10am.
  // Arrived 10:00 AM, left 07:00 PM -> PRESENT
  { employeeId: "EMP-31", date: "2026-09-28", actualIn: "10:00 AM", actualOut: "07:00 PM", monthlyLateCountBeforeThis: 0 },
];
