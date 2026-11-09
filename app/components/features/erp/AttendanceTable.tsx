"use client";

import { useMemo, useState } from "react";
import { OPENING_START_MIN } from "@/lib/erp/time";
import type { DayOutcome } from "@/lib/erp/types";
import type { DayView, EmployeeAttendance } from "./erpApi";
import { clock, DEDUCTION_LABEL, hm, needsWomenSafety, OUTCOME, shiftLabel } from "./erpFormat";

export type AttendanceRow = { employee: EmployeeAttendance["employee"]; day: DayView };

interface AttendanceTableProps {
  rows: AttendanceRow[];
  // Null when the cycle is frozen: nothing in it can be regularised.
  onRegularise: ((row: AttendanceRow) => void) | null;
}

const FILTERS: { value: string; label: string; match: (o: DayOutcome) => boolean }[] = [
  { value: "ALL", label: "All", match: () => true },
  { value: "ISSUES", label: "Needs attention", match: (o) => !["PRESENT", "WEEKLY_OFF", "LEAVE", "HOLIDAY"].includes(o) },
  ...(Object.keys(OUTCOME) as DayOutcome[]).map((o) => ({
    value: o,
    label: OUTCOME[o].label,
    match: (x: DayOutcome) => x === o,
  })),
];

export default function AttendanceTable({ rows, onRegularise }: AttendanceTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("ALL");

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    const match = FILTERS.find((f) => f.value === filter)?.match ?? (() => true);
    return rows.filter(
      ({ employee: e, day }) =>
        match(day.outcome) &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.emp_code.toLowerCase().includes(q) ||
          (e.task ?? "").toLowerCase().includes(q)),
    );
  }, [rows, searchTerm, filter]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <input
          type="text"
          placeholder="Search by name, emp code or task…"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500">Show:</span>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-hidden"
          >
            {FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label} ({rows.filter((r) => f.match(r.day.outcome)).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                <th className="px-4 py-3">Employee</th>
                <th className="px-3 py-3">Shift</th>
                <th className="px-3 py-3">Punches</th>
                <th className="px-3 py-3">Late / early</th>
                <th className="px-3 py-3">Hours</th>
                <th className="px-3 py-3">Outcome</th>
                <th className="px-4 py-3">Why</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No matching attendance records.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const { employee: e, day: d } = row;
                  const isShift = d.startMin !== null;
                  const deduction = DEDUCTION_LABEL[d.deduction];
                  return (
                    <tr key={e.id} className="align-top transition hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              e.gender === "F" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {e.gender}
                          </span>
                          <div>
                            <span className="font-semibold text-slate-900">{e.name}</span>
                            <span className="block text-[11px] text-slate-400">
                              {e.emp_code}
                              {e.task ? ` · ${e.task}` : ""}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        {isShift ? (
                          <>
                            <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-medium text-slate-700">
                              {shiftLabel({ kind: "SHIFT", startMin: d.startMin, endMin: d.endMin })}
                            </span>
                            {d.startMin === OPENING_START_MIN ? (
                              <span className="mt-1 block text-[10px] font-semibold text-emerald-700">Opening shift</span>
                            ) : null}
                          </>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3 font-mono">
                        {isShift ? (
                          <>
                            <div className={d.inMin === null ? "italic text-slate-400" : "text-slate-800"}>
                              <span className="font-sans text-[10px] uppercase text-slate-400">In </span>
                              {clock(d.inMin)}
                            </div>
                            <div className={d.outMin === null ? "italic text-slate-400" : "text-slate-800"}>
                              <span className="font-sans text-[10px] uppercase text-slate-400">Out </span>
                              {clock(d.outMin)}
                            </div>
                          </>
                        ) : null}
                      </td>

                      <td className="px-3 py-3">
                        {d.lateMinutes === 0 && d.earlyMinutes === 0 ? (
                          isShift && d.inMin !== null && d.outMin !== null ? (
                            <span className="text-[11px] font-medium text-emerald-600">✓ On time</span>
                          ) : null
                        ) : (
                          <div className="space-y-0.5">
                            {d.lateMinutes > 0 ? (
                              <div className="font-semibold text-amber-700">+{d.lateMinutes} min late</div>
                            ) : null}
                            {d.earlyMinutes > 0 ? (
                              <div className="font-semibold text-amber-700">{d.earlyMinutes} min early</div>
                            ) : null}
                            {d.occurrenceNo !== null ? (
                              <span
                                className={`inline-block rounded px-1.5 text-[10px] font-bold ${
                                  d.severity === "MAJOR" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {d.severity === "MAJOR" ? "Major" : "Minor"} · late #{d.occurrenceNo}
                              </span>
                            ) : null}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3 font-mono">
                        {d.spanMinutes > 0 ? (
                          <span className={d.spanMinutes < 7 * 60 ? "font-semibold text-rose-600" : "text-slate-800"}>
                            {hm(d.spanMinutes)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${OUTCOME[d.outcome].badge}`}
                        >
                          {OUTCOME[d.outcome].label}
                        </span>
                        {deduction ? (
                          <span className="mt-1 block text-[10px] font-semibold text-rose-700">{deduction}</span>
                        ) : null}
                      </td>

                      <td className="max-w-xs space-y-1 px-4 py-3">
                        {d.reasons.map((r, i) => (
                          <div key={i} className="text-[11px] leading-tight text-slate-600">
                            • {r}
                          </div>
                        ))}
                        {needsWomenSafety(e.gender, d) ? (
                          <span className="inline-block rounded-md bg-pink-100 px-2 py-0.5 text-[10px] font-bold text-pink-800">
                            Ends after 21:30 — consent &amp; store transport required
                          </span>
                        ) : null}
                      </td>

                      <td className="px-3 py-3 text-right">
                        {onRegularise && isShift ? (
                          <button
                            type="button"
                            onClick={() => onRegularise(row)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 shadow-2xs hover:border-blue-400 hover:bg-blue-50/50 hover:text-blue-700"
                          >
                            Regularise
                          </button>
                        ) : null}
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
