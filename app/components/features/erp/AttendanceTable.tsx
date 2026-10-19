"use client";

import { useMemo, useState } from "react";
import type { AttendanceRecord, AttendanceStatus } from "./erpTypes";

interface AttendanceTableProps {
  records: AttendanceRecord[];
  onOpenRegularise: (record: AttendanceRecord) => void;
}

export default function AttendanceTable({ records, onOpenRegularise }: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchSearch =
        rec.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rec.role.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchSearch) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "PRESENT_ALL") {
        return rec.status === "PRESENT" || rec.status === "PRESENT_GRACE_LATE";
      }
      return rec.status === statusFilter;
    });
  }, [records, searchTerm, statusFilter]);

  const renderStatusBadge = (rec: AttendanceRecord) => {
    switch (rec.status) {
      case "PRESENT":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Present
          </span>
        );
      case "PRESENT_GRACE_LATE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Present (Grace Late)
          </span>
        );
      case "HALF_DAY":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            Half Day
          </span>
        );
      case "WEEKLY_OFF":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-2.5 py-1 text-xs font-semibold text-yellow-900 ring-1 ring-yellow-600/30">
            Weekly Off (WO)
          </span>
        );
      case "LEAVE":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-600/20">
            Leave (FRM-01)
          </span>
        );
      case "ABSENT":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-800 ring-1 ring-red-600/30">
            Absent
          </span>
        );
      default:
        return <span>{rec.status}</span>;
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="relative flex-1 min-w-[220px]">
          <input
            type="text"
            placeholder="Search employee by name, role, task..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
          />
          <svg
            className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden"
          >
            <option value="ALL">All Statuses ({records.length})</option>
            <option value="PRESENT_ALL">All Present</option>
            <option value="PRESENT">Punctual Present</option>
            <option value="PRESENT_GRACE_LATE">Grace Late</option>
            <option value="HALF_DAY">Half Day</option>
            <option value="WEEKLY_OFF">Weekly Off (WO)</option>
            <option value="LEAVE">Approved Leave</option>
            <option value="ABSENT">Absent</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3">Dedicated Shift</th>
                <th className="px-3 py-3">Biometric Punches</th>
                <th className="px-3 py-3">Late & Grace Status</th>
                <th className="px-3 py-3">Hours Worked (9h Req.)</th>
                <th className="px-3 py-3">Calculated Status</th>
                <th className="px-4 py-3">Rule Assessment / Policy Notes</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No matching attendance records found.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const isShortHours =
                    rec.status === "HALF_DAY" &&
                    rec.statusReasons.some((r) => r.includes("Short of mandatory 9.0-hr"));

                  const is4thLate =
                    rec.status === "HALF_DAY" &&
                    rec.statusReasons.some((r) => r.includes("4th late") || r.includes("grace limit"));

                  return (
                    <tr
                      key={rec.id}
                      className={`transition hover:bg-slate-50/70 ${
                        rec.status === "HALF_DAY"
                          ? "bg-rose-50/20"
                          : rec.status === "PRESENT_GRACE_LATE"
                          ? "bg-amber-50/15"
                          : ""
                      }`}
                    >
                      {/* Employee details */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              rec.gender === "F"
                                ? "bg-pink-100 text-pink-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                            title={`Gender: ${rec.gender === "F" ? "Female" : "Male"}`}
                          >
                            {rec.gender}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900">{rec.employeeName}</span>
                            <span className="block text-[11px] text-slate-400">{rec.role}</span>
                          </div>
                        </div>
                      </td>

                      {/* Scheduled Shift */}
                      <td className="px-3 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-medium text-slate-700">
                          {rec.scheduledShift}
                        </span>
                        {rec.scheduledStart !== "--" && (
                          <div className="mt-1 text-[11px] text-slate-400">
                            {rec.scheduledStart} - {rec.scheduledEnd}
                          </div>
                        )}
                      </td>

                      {/* Punches */}
                      <td className="px-3 py-3 font-mono">
                        {rec.actualIn ? (
                          <div className="text-slate-800">
                            <span className="text-[10px] uppercase text-slate-400 font-sans">In: </span>
                            <span className="font-medium">{rec.actualIn}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No in-punch</span>
                        )}
                        {rec.actualOut ? (
                          <div className="text-slate-800">
                            <span className="text-[10px] uppercase text-slate-400 font-sans">Out: </span>
                            <span className="font-medium">{rec.actualOut}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No out-punch</span>
                        )}
                      </td>

                      {/* Late / Grace */}
                      <td className="px-3 py-3">
                        {rec.lateMinutes === 0 ? (
                          <span className="inline-flex items-center text-[11px] font-medium text-emerald-600">
                            ✓ On Time
                          </span>
                        ) : rec.lateMinutes <= 30 ? (
                          <div>
                            <span
                              className={`font-semibold ${
                                is4thLate ? "text-rose-600" : "text-amber-600"
                              }`}
                            >
                              +{rec.lateMinutes} mins late
                            </span>
                            <div className="mt-0.5">
                              {is4thLate ? (
                                <span className="inline-block rounded bg-rose-100 px-1.5 py-0.2 text-[10px] font-bold text-rose-800">
                                  4th Late (Penalty)
                                </span>
                              ) : (
                                <span className="inline-block rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-medium text-amber-800">
                                  Grace {rec.monthlyLateCountBeforeThis + 1}/3
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-rose-600">
                              +{rec.lateMinutes} mins late
                            </span>
                            <span className="block text-[10px] text-rose-500 font-medium">
                              Exceeded 30m window
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Hours worked */}
                      <td className="px-3 py-3">
                        {rec.totalHoursWorked > 0 ? (
                          <div>
                            <span
                              className={`font-mono text-xs font-semibold ${
                                rec.totalHoursWorked < 9.0 ? "text-rose-600" : "text-slate-800"
                              }`}
                            >
                              {rec.totalHoursWorked.toFixed(2)} hrs
                            </span>
                            {rec.totalHoursWorked < 9.0 && (
                              <span className="block text-[10px] font-bold text-rose-600">
                                Short (&lt; 9.0 hrs)
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">0 hrs</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3">{renderStatusBadge(rec)}</td>

                      {/* Assessment Notes */}
                      <td className="max-w-xs px-4 py-3">
                        <div className="space-y-1">
                          {rec.statusReasons.map((r, i) => (
                            <div
                              key={i}
                              className={`text-[11px] leading-tight ${
                                r.includes("Short of mandatory") || r.includes("4th late")
                                  ? "font-semibold text-rose-600"
                                  : r.includes("Grace pardon")
                                  ? "text-amber-700"
                                  : r.includes("[REGULARISED")
                                  ? "font-semibold text-blue-700"
                                  : "text-slate-500"
                              }`}
                            >
                              • {r}
                            </div>
                          ))}
                          {rec.isWomenSafetyAlert && (
                            <span className="inline-block rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-800">
                              SOP Safety Alert: Ends &gt;21:30 (Store Cab &amp; Consent Required)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Regularise Action */}
                      <td className="px-3 py-3 text-right">
                        {rec.status !== "WEEKLY_OFF" && rec.status !== "LEAVE" && (
                          <button
                            type="button"
                            onClick={() => onOpenRegularise(rec)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700"
                          >
                            Regularise
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
