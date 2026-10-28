import type { UploadIssue } from "@/app/components/shared/api";
import type { DayView, EmployeeAttendance } from "@/lib/erp/attendance";
import type { RegularisationType, ShiftKind } from "@/lib/erp/types";

export type { DayView, EmployeeAttendance };

export type CycleStatus = "OPEN" | "FROZEN";

export type AttendanceResponse = {
  asOf: string;
  cycle: { start: string; end: string; status: CycleStatus };
  // Last day with uploaded punches; null when the cycle has none yet.
  evaluatedThrough: string | null;
  employees: EmployeeAttendance[];
};

export type RosterShift = {
  date: string;
  kind: ShiftKind;
  startMin: number | null;
  endMin: number | null;
  isOpening: boolean;
};

export type RosterEmployee = {
  id: string;
  emp_code: string;
  name: string;
  gender: "M" | "F";
  task: string | null;
  active: boolean;
  shifts: RosterShift[];
};

export type RegularisationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type RegularisationRow = {
  id: string;
  employee: { emp_code: string; name: string };
  date: string;
  type: RegularisationType;
  inMin: number | null;
  outMin: number | null;
  note: string;
  status: RegularisationStatus;
  requestedBy: string;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  canDecide: boolean;
};

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Network error — could not reach the server");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const getAttendance = (date: string) =>
  call<AttendanceResponse>(`/api/erp/attendance?date=${date}`);

export const getRoster = (from: string, to: string) =>
  call<{ from: string; to: string; employees: RosterEmployee[] }>(`/api/erp/roster?from=${from}&to=${to}`);

export const listRegularisations = (status: RegularisationStatus, date: string) =>
  call<{ cycle: { start: string; end: string }; regularisations: RegularisationRow[] }>(
    `/api/erp/regularisations?status=${status}&date=${date}`,
  );

export const createRegularisation = (body: {
  employeeId: string;
  date: string;
  type: RegularisationType;
  inTime?: string;
  outTime?: string;
  note: string;
}) => call<{ id: string }>("/api/erp/regularisations", json("POST", body));

export const decideRegularisation = (id: string, decision: "APPROVE" | "REJECT") =>
  call<{ id: string; status: RegularisationStatus }>(`/api/erp/regularisations/${id}`, json("PATCH", { decision }));

export const freezeCycle = (start: string) =>
  call<{ start: string; end: string; employees: number }>(`/api/erp/cycles/${start}/freeze`, { method: "POST" });

export type SheetKind = "roster" | "punches";

// Same contract as uploadOrders: every validation error comes back at once and
// nothing is saved unless the whole sheet is valid.
export async function uploadSheet(
  kind: SheetKind,
  file: File,
): Promise<{ ok: true; summary: string } | { ok: false; errors: UploadIssue[] }> {
  const body = new FormData();
  body.append("file", file);
  let res: Response;
  try {
    res = await fetch(`/api/erp/${kind}/upload`, { method: "POST", body });
  } catch {
    return { ok: false, errors: [{ sheet: "-", row: 0, message: "Network error — could not reach the server" }] };
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok) {
    return {
      ok: true,
      summary:
        kind === "roster"
          ? `Saved ${data.shifts} roster day(s) for ${data.employees} employee(s).`
          : `Saved ${data.rows} punch row(s).`,
    };
  }
  const errors: UploadIssue[] =
    Array.isArray(data.errors) && data.errors.length
      ? (data.errors as UploadIssue[])
      : [{ sheet: "-", row: 0, message: data.error ?? "Upload failed" }];
  return { ok: false, errors };
}
