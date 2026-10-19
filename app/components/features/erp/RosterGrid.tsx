"use client";

import React, { useMemo } from "react";
import { exportRosterExcel } from "./erpEngine";
import type { RosterDay, RosterEntry } from "./erpTypes";

interface RosterGridProps {
  entries: RosterEntry[];
  days: RosterDay[];
}

export default function RosterGrid({ entries, days }: RosterGridProps) {
  // Group entries by category
  const categories = useMemo(() => {
    const map: Record<string, RosterEntry[]> = {
      "Store Sales Associates": [],
      "Specialists & Duty Leads": [],
      "Store Operations Management": [],
      "Customer Service (CS)": [],
      "CRM Team": [],
      "Cashier": [],
      "Temporary Staff": [],
      "Backend & Visual Merchandising": [],
    };

    entries.forEach((e) => {
      if (e.category === "Sales Associate") map["Store Sales Associates"].push(e);
      else if (e.category === "Specialist / Lead") map["Specialists & Duty Leads"].push(e);
      else if (e.category === "Store Management") map["Store Operations Management"].push(e);
      else if (e.category === "Customer Service") map["Customer Service (CS)"].push(e);
      else if (e.category === "CRM") map["CRM Team"].push(e);
      else if (e.category === "Cashier") map["Cashier"].push(e);
      else if (e.category === "Temp Staff") map["Temporary Staff"].push(e);
      else if (e.category === "Backend") map["Backend & Visual Merchandising"].push(e);
      else map["Store Sales Associates"].push(e);
    });

    return map;
  }, [entries]);

  // Compute staffing counts per day for the management metrics row
  const dayStats = useMemo(() => {
    return days.map((day) => {
      let count9AM = 0;
      let count1045 = 0;
      let count12to9 = 0;
      let count1to10 = 0;
      let count130to1030 = 0;
      let availableStaff = 0;
      let offOrLeave = 0;

      entries.forEach((entry) => {
        const shift = entry.schedule[day.date] || "10:45AM-7:45PM";
        const norm = shift.trim().toUpperCase();

        if (norm === "WO" || norm === "LEAVE") {
          offOrLeave++;
        } else {
          availableStaff++;
          if (norm.includes("9:00AM") || norm.includes("9AM")) count9AM++;
          else if (norm.includes("10:45")) count1045++;
          else if (norm.includes("12-9")) count12to9++;
          else if (norm.includes("1-10")) count1to10++;
          else if (norm.includes("1:30")) count130to1030++;
        }
      });

      return {
        date: day.date,
        count9AM,
        count1045,
        count12to9,
        count1to10,
        count130to1030,
        availableStaff,
        offOrLeave,
        total: entries.length,
      };
    });
  }, [entries, days]);

  const getShiftBadge = (shift: string) => {
    const norm = shift.trim().toUpperCase();
    if (norm === "WO") {
      return (
        <span className="inline-block w-full rounded bg-yellow-200 py-1 text-center font-bold text-yellow-900 shadow-2xs">
          WO
        </span>
      );
    }
    if (norm === "LEAVE") {
      return (
        <span className="inline-block w-full rounded bg-purple-200 py-1 text-center font-bold text-purple-900 shadow-2xs">
          Leave
        </span>
      );
    }
    if (norm.includes("10:45")) {
      return (
        <span className="inline-block w-full rounded bg-emerald-100 py-1 text-center font-semibold text-emerald-800 shadow-2xs text-[10px]">
          10:45AM-7:45PM
        </span>
      );
    }
    if (norm.includes("1-10")) {
      return (
        <span className="inline-block w-full rounded bg-orange-100 py-1 text-center font-semibold text-orange-900 shadow-2xs">
          1-10PM
        </span>
      );
    }
    if (norm.includes("9:00AM") || norm.includes("9AM")) {
      return (
        <span className="inline-block w-full rounded bg-pink-100 py-1 text-center font-semibold text-pink-900 shadow-2xs">
          {shift}
        </span>
      );
    }
    if (norm.includes("9:45")) {
      return (
        <span className="inline-block w-full rounded bg-amber-100 py-1 text-center font-semibold text-amber-900 shadow-2xs">
          {shift}
        </span>
      );
    }
    return (
      <span className="inline-block w-full rounded bg-slate-100 py-1 text-center font-medium text-slate-800">
        {shift}
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Weekly Store Roster Matrix (SOP-11-02 Compliant)
          </h3>
          <p className="text-xs text-slate-500">
            Weekly 9-hour shift bands, 2 weekly offs, women's timing restrictions, and daily floor staffing quotas.
          </p>
        </div>
        <button
          type="button"
          onClick={() => exportRosterExcel(entries, days, "28Sep_04Oct_2026")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600"
        >
          <svg className="h-4 w-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Roster to Excel (.xlsx)
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100 font-bold text-slate-700">
                <th className="w-12 px-2 py-2.5 text-center">SR no.</th>
                <th className="px-3 py-2.5">NAME</th>
                <th className="w-12 px-2 py-2.5 text-center">Gender</th>
                <th className="px-3 py-2.5">ADD Task / Role</th>
                {days.map((d) => (
                  <th key={d.date} className="min-w-[105px] px-2 py-2.5 text-center">
                    <div>{d.label}</div>
                    <div className="text-[10px] uppercase text-slate-500 font-normal">{d.dayName}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {Object.entries(categories).map(([catTitle, catEntries]) => {
                if (catEntries.length === 0) return null;
                return (
                  <React.Fragment key={catTitle}>
                    {/* Category Header */}
                    <tr className="bg-slate-50/90 font-bold text-slate-700">
                      <td colSpan={4 + days.length} className="px-3 py-1.5 text-xs tracking-wider uppercase text-blue-700">
                        {catTitle} ({catEntries.length})
                      </td>
                    </tr>

                    {/* Category Staff Rows */}
                    {catEntries.map((emp, index) => (
                      <tr key={emp.employeeId} className="hover:bg-slate-50/60 transition">
                        <td className="px-2 py-2 text-center text-slate-500">{index + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900">{emp.employeeName}</td>
                        <td className="px-2 py-2 text-center">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                              emp.gender === "F" ? "bg-pink-100 text-pink-700" : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {emp.gender}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-slate-600">{emp.role}</td>
                        {days.map((d) => (
                          <td key={d.date} className="px-1.5 py-1.5">
                            {getShiftBadge(emp.schedule[d.date] || "10:45AM-7:45PM")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Staffing Summary Rows from Image 3 */}
              <tr className="border-t-2 border-slate-300 bg-slate-100 font-bold text-slate-800">
                <td colSpan={4} className="px-3 py-2 text-right">
                  TOTAL AVAILABLE STAFF
                </td>
                {dayStats.map((s) => (
                  <td key={s.date} className="px-2 py-2 text-center bg-emerald-100/70 font-bold text-emerald-900">
                    {s.availableStaff}
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-100 text-slate-700">
                <td colSpan={4} className="px-3 py-1.5 text-right font-medium">
                  Total Staff on Leave / Weekoff
                </td>
                {dayStats.map((s) => (
                  <td key={s.date} className="px-2 py-1.5 text-center bg-amber-100/70 font-semibold text-amber-900">
                    {s.offOrLeave}
                  </td>
                ))}
              </tr>

              <tr className="bg-slate-200 font-bold text-slate-900">
                <td colSpan={4} className="px-3 py-1.5 text-right">
                  Total Team Strength
                </td>
                {dayStats.map((s) => (
                  <td key={s.date} className="px-2 py-1.5 text-center font-bold">
                    {s.total}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>

        {/* Bottom Banner from Image 3 */}
        <div className="border-t border-red-200 bg-red-600 px-4 py-2 text-center text-xs font-semibold text-white">
          Note : All Preference pertaining to the roster is subject to availability and shall be considered depending upon the operational requirement
        </div>
      </div>
    </div>
  );
}
