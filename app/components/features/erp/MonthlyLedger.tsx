"use client";

import { useMemo, useState } from "react";
import type { MonthlyEmployeeSummary } from "./erpTypes";

interface MonthlyLedgerProps {
  summaries: MonthlyEmployeeSummary[];
  cycleLabel: string;
}

export default function MonthlyLedger({ summaries, cycleLabel }: MonthlyLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(() => {
    return summaries.filter(
      (s) =>
        s.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [summaries, searchTerm]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Monthly Attendance Cycle Ledger ({cycleLabel})
          </h3>
          <p className="text-xs text-slate-500">
            Cumulative tracking of the 3-day late grace limit, half-day deductions (4th late &amp; &lt;9h shifts), and regularisation history.
          </p>
        </div>
        <div className="relative min-w-[240px]">
          <input
            type="text"
            placeholder="Search employee..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
          />
          <svg
            className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400"
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
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3 text-center">Punctual Days</th>
                <th className="px-3 py-3 text-center">
                  Late Grace Used
                  <span className="block text-[10px] text-slate-400 font-normal">(Max 3 Days)</span>
                </th>
                <th className="px-3 py-3 text-center">
                  4th Late Half Days
                  <span className="block text-[10px] text-slate-400 font-normal">(Penalty Triggered)</span>
                </th>
                <th className="px-3 py-3 text-center">
                  &lt;9h Short Half Days
                  <span className="block text-[10px] text-slate-400 font-normal">(&lt;9h Shift Rule)</span>
                </th>
                <th className="px-3 py-3 text-center font-bold text-slate-800">Total Half Days</th>
                <th className="px-3 py-3 text-center">WO / Leaves</th>
                <th className="px-3 py-3 text-center">Total Hours</th>
                <th className="px-4 py-3 text-right">Compliance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.employeeId} className="hover:bg-slate-50/70 transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          item.gender === "F" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {item.gender}
                      </span>
                      <div>
                        <span className="font-semibold text-slate-900">{item.employeeName}</span>
                        <span className="block text-[11px] text-slate-400">{item.role}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center font-semibold text-emerald-700">
                    {item.daysPresentPunctual}
                  </td>

                  <td className="px-3 py-3 text-center">
                    <div className="inline-flex items-center gap-1.5">
                      <span
                        className={`rounded-md px-2 py-0.5 font-bold ${
                          item.daysGraceLate === 0
                            ? "bg-slate-100 text-slate-600"
                            : item.daysGraceLate <= 2
                            ? "bg-amber-100 text-amber-800"
                            : "bg-orange-100 text-orange-900"
                        }`}
                      >
                        {item.daysGraceLate} / 3
                      </span>
                    </div>
                  </td>

                  <td className="px-3 py-3 text-center font-semibold">
                    {item.daysHalfDay4thLate > 0 ? (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800 font-bold">
                        {item.daysHalfDay4thLate}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center font-semibold">
                    {item.daysHalfDayShortHours > 0 ? (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-rose-800 font-bold">
                        {item.daysHalfDayShortHours}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center font-bold">
                    {item.totalHalfDays > 0 ? (
                      <span className="text-rose-700 text-xs">{item.totalHalfDays}</span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>

                  <td className="px-3 py-3 text-center text-slate-600">
                    {item.daysWeeklyOff} WO / {item.daysLeave} Leave
                  </td>

                  <td className="px-3 py-3 text-center font-mono font-medium text-slate-700">
                    {item.totalHoursWorked} hrs
                  </td>

                  <td className="px-4 py-3 text-right">
                    {item.exceededGraceLimit ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[11px] font-semibold text-rose-800">
                        ⚠️ Grace Exceeded
                      </span>
                    ) : item.totalHalfDays > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800">
                        Half Day Deduction
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-800">
                        ✓ Compliant
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
