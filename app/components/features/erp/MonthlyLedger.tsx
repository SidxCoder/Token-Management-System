"use client";

import { useMemo, useState } from "react";
import type { EmployeeAttendance } from "./erpApi";

interface MonthlyLedgerProps {
  employees: EmployeeAttendance[];
  cycleLabel: string;
}

const DISCIPLINARY_LABEL = {
  WARNING_1: "Warning 1",
  WARNING_2: "Warning 2",
  SHOW_CAUSE: "Show-cause",
  MISSED_PUNCH_CAUTION: "Missed-punch caution",
} as const;

const INCENTIVE = {
  FULL: { label: "Full", className: "bg-emerald-100 text-emerald-800" },
  HALF: { label: "50%", className: "bg-amber-100 text-amber-800" },
  NONE: { label: "None", className: "bg-rose-100 text-rose-800" },
} as const;

export default function MonthlyLedger({ employees, cycleLabel }: MonthlyLedgerProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return employees
      .filter(({ employee: e }) => !q || e.name.toLowerCase().includes(q) || e.emp_code.toLowerCase().includes(q))
      .map((a) => {
        const count = (pred: (d: (typeof a.days)[number]) => boolean) => a.days.filter(pred).length;
        return {
          ...a,
          worked: count((d) => d.startMin !== null && d.inMin !== null && d.outMin !== null),
          halfDays: count((d) => d.deduction === "HALF_LEAVE"),
          fullDays: count((d) => d.deduction === "FULL_LEAVE"),
          unpaid: count((d) => d.deduction === "UNPAID"),
          off: count((d) => d.outcome === "WEEKLY_OFF" || d.outcome === "LEAVE" || d.outcome === "HOLIDAY"),
        };
      });
  }, [employees, searchTerm]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Cycle ledger ({cycleLabel})</h3>
          <p className="text-xs text-slate-500">
            Counted lates, leave deductions, warnings and incentive for each employee this cycle.
          </p>
        </div>
        <input
          type="text"
          placeholder="Search employee…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="min-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-hidden"
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3 text-center">Days worked</th>
                <th className="px-3 py-3 text-center">
                  Counted lates
                  <span className="block text-[10px] font-normal text-slate-400">every 3rd = ½ day</span>
                </th>
                <th className="px-3 py-3 text-center">
                  Excuses used
                  <span className="block text-[10px] font-normal text-slate-400">max 3</span>
                </th>
                <th className="px-3 py-3 text-center">½ days</th>
                <th className="px-3 py-3 text-center">Full-day leave</th>
                <th className="px-3 py-3 text-center">Unpaid</th>
                <th className="px-3 py-3 text-center">Missed punches</th>
                <th className="px-3 py-3 text-center">Off / leave</th>
                <th className="px-3 py-3">Warnings</th>
                <th className="px-4 py-3 text-right">Incentive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-10 text-center text-slate-400">
                    No employees to show.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const n = (v: number, warn = true) => (
                    <span className={v > 0 && warn ? "font-bold text-rose-700" : "text-slate-500"}>{v}</span>
                  );
                  return (
                    <tr key={r.employee.id} className="transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-900">{r.employee.name}</span>
                        <span className="block text-[11px] text-slate-400">
                          {r.employee.emp_code}
                          {r.employee.task ? ` · ${r.employee.task}` : ""}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center font-semibold text-slate-800">{r.worked}</td>
                      <td className="px-3 py-3 text-center">{n(r.summary.countedLates)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-semibold text-slate-700">
                          {r.summary.excusesUsed} / 3
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">{n(r.halfDays)}</td>
                      <td className="px-3 py-3 text-center">{n(r.fullDays)}</td>
                      <td className="px-3 py-3 text-center">{n(r.unpaid)}</td>
                      <td className="px-3 py-3 text-center">{n(r.summary.missedPunches)}</td>
                      <td className="px-3 py-3 text-center">{n(r.off, false)}</td>
                      <td className="px-3 py-3">
                        {r.summary.disciplinary.length ? (
                          <div className="flex flex-wrap gap-1">
                            {r.summary.disciplinary.map((d, i) => (
                              <span
                                key={i}
                                title={d.date}
                                className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-800"
                              >
                                {DISCIPLINARY_LABEL[d.kind]}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${INCENTIVE[r.summary.incentive].className}`}
                        >
                          {INCENTIVE[r.summary.incentive].label}
                        </span>
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
