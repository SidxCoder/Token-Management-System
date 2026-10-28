"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import { DocumentIcon } from "@/app/components/dashboard/icons";
import { addDays, OPENING_START_MIN } from "@/lib/erp/time";
import { getRoster, type RosterEmployee, type RosterShift } from "./erpApi";
import { datesBetween, dayLabel, needsWomenSafety, shiftLabel } from "./erpFormat";
import { exportRoster } from "./erpSheets";

interface RosterGridProps {
  initialFrom: string;
  // Bumped by the parent after an upload so the grid reloads.
  refreshKey: number;
}

// SOP-11-02: two weekly offs in every week.
const WEEKLY_OFFS = 2;

function cellClass(s: RosterShift | undefined, gender: "M" | "F"): string {
  if (!s) return "bg-white text-slate-300";
  if (s.kind === "WEEKLY_OFF") return "bg-yellow-200 font-bold text-yellow-900";
  if (s.kind === "LEAVE") return "bg-purple-200 font-bold text-purple-900";
  if (s.kind === "HOLIDAY") return "bg-slate-200 font-bold text-slate-700";
  if (needsWomenSafety(gender, s)) return "bg-pink-200 font-semibold text-pink-900 ring-1 ring-pink-500";
  if (s.startMin === OPENING_START_MIN) return "bg-emerald-100 font-semibold text-emerald-800";
  return "bg-slate-100 font-medium text-slate-800";
}

export default function RosterGrid({ initialFrom, refreshKey }: RosterGridProps) {
  const [from, setFrom] = useState(initialFrom);
  const [employees, setEmployees] = useState<RosterEmployee[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const to = addDays(from, 6);
  const dates = useMemo(() => datesBetween(from, to), [from, to]);

  const load = useCallback(async () => {
    setError(null);
    try {
      setEmployees((await getRoster(from, to)).employees);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roster");
    }
  }, [from, to]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load, refreshKey]);

  // Grouped by the roster's Task column, like the store sheet.
  const groups = useMemo(() => {
    const map = new Map<string, RosterEmployee[]>();
    for (const e of employees ?? []) {
      const key = e.task || "Unassigned";
      map.set(key, [...(map.get(key) ?? []), e]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [employees]);

  const byDate = useMemo(
    () => new Map((employees ?? []).map((e) => [e.id, new Map(e.shifts.map((s) => [s.date, s]))])),
    [employees],
  );

  // Headcount per shift band per day, then the floor totals.
  const stats = useMemo(() => {
    const bands = new Map<string, { startMin: number; counts: number[] }>();
    const working = dates.map(() => 0);
    const off = dates.map(() => 0);
    const unrostered = dates.map(() => 0);
    for (const e of employees ?? []) {
      dates.forEach((d, i) => {
        const s = byDate.get(e.id)?.get(d);
        if (!s) unrostered[i]++;
        else if (s.kind !== "SHIFT") off[i]++;
        else {
          working[i]++;
          const label = shiftLabel(s);
          const band = bands.get(label) ?? { startMin: s.startMin ?? 0, counts: dates.map(() => 0) };
          band.counts[i]++;
          bands.set(label, band);
        }
      });
    }
    return {
      bands: [...bands.entries()].sort(([, a], [, b]) => a.startMin - b.startMin),
      working,
      off,
      unrostered,
    };
  }, [employees, dates, byDate]);

  const navButton =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Weekly roster</h3>
          <p className="text-xs text-slate-500">
            Shift bands, weekly offs and daily floor strength. Pink cells are women&apos;s shifts ending after 21:30.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={navButton} onClick={() => setFrom(addDays(from, -7))}>
            ← Prev week
          </button>
          <input
            type="date"
            value={from}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
          />
          <button type="button" className={navButton} onClick={() => setFrom(addDays(from, 7))}>
            Next week →
          </button>
          <button
            type="button"
            disabled={!employees?.length}
            onClick={() => employees && exportRoster(employees, dates)}
            className={`${navButton} disabled:opacity-50`}
          >
            Export week (.xlsx)
          </button>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : employees === null ? (
        <Loader label="Loading roster…" />
      ) : employees.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon className="h-6 w-6" />}
          title="No roster for this week"
          subtitle="Upload the roster sheet to add employees and their shifts."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                  <th className="px-3 py-2.5">Name</th>
                  <th className="w-12 px-2 py-2.5 text-center">Gender</th>
                  {dates.map((d) => (
                    <th key={d} className="min-w-[110px] px-2 py-2.5 text-center">
                      {dayLabel(d)}
                    </th>
                  ))}
                  <th className="px-2 py-2.5 text-center">WO</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {groups.map(([task, members]) => (
                  <React.Fragment key={task}>
                    <tr className="bg-slate-50/90">
                      <td colSpan={3 + dates.length} className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-700">
                        {task} ({members.length})
                      </td>
                    </tr>
                    {members.map((e) => {
                      const shifts = byDate.get(e.id);
                      const wo = dates.filter((d) => shifts?.get(d)?.kind === "WEEKLY_OFF").length;
                      return (
                        <tr key={e.id} className="transition hover:bg-slate-50/60">
                          <td className="px-3 py-2">
                            <span className="font-semibold text-slate-900">{e.name}</span>
                            <span className="block text-[11px] text-slate-400">{e.emp_code}</span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                e.gender === "F" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {e.gender}
                            </span>
                          </td>
                          {dates.map((d) => {
                            const s = shifts?.get(d);
                            return (
                              <td key={d} className="px-1.5 py-1.5">
                                <span className={`block rounded py-1 text-center text-[10px] ${cellClass(s, e.gender)}`}>
                                  {s ? shiftLabel(s) : "—"}
                                </span>
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-center">
                            <span
                              title={wo === WEEKLY_OFFS ? undefined : `SOP-11-02 expects ${WEEKLY_OFFS} weekly offs a week`}
                              className={wo === WEEKLY_OFFS ? "text-slate-500" : "rounded bg-rose-100 px-1.5 font-bold text-rose-800"}
                            >
                              {wo}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}

                {stats.bands.map(([label, band]) => (
                  <tr key={label} className="bg-slate-50 text-slate-700">
                    <td colSpan={2} className="px-3 py-1.5 text-right font-medium">
                      {label}
                    </td>
                    {band.counts.map((c, i) => (
                      <td key={i} className="px-2 py-1.5 text-center font-semibold">
                        {c || ""}
                      </td>
                    ))}
                    <td />
                  </tr>
                ))}
                <tr className="border-t-2 border-slate-300 bg-emerald-50 font-bold text-emerald-900">
                  <td colSpan={2} className="px-3 py-2 text-right">
                    Total available staff
                  </td>
                  {stats.working.map((c, i) => (
                    <td key={i} className="px-2 py-2 text-center">
                      {c}
                    </td>
                  ))}
                  <td />
                </tr>
                <tr className="bg-amber-50 font-semibold text-amber-900">
                  <td colSpan={2} className="px-3 py-1.5 text-right">
                    On weekly off / leave / holiday
                  </td>
                  {stats.off.map((c, i) => (
                    <td key={i} className="px-2 py-1.5 text-center">
                      {c}
                    </td>
                  ))}
                  <td />
                </tr>
                {stats.unrostered.some(Boolean) ? (
                  <tr className="bg-rose-50 font-semibold text-rose-800">
                    <td colSpan={2} className="px-3 py-1.5 text-right">
                      Not rostered
                    </td>
                    {stats.unrostered.map((c, i) => (
                      <td key={i} className="px-2 py-1.5 text-center">
                        {c || ""}
                      </td>
                    ))}
                    <td />
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="border-t border-red-200 bg-red-600 px-4 py-2 text-center text-xs font-semibold text-white">
            Note: All preferences pertaining to the roster are subject to availability and shall be considered
            depending upon the operational requirement
          </div>
        </div>
      )}
    </div>
  );
}
