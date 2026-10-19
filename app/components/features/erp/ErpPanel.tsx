"use client";

import { useMemo, useState } from "react";
import AttendanceTable from "./AttendanceTable";
import ExcelUploadModal from "./ExcelUploadModal";
import MonthlyLedger from "./MonthlyLedger";
import RegulariseModal from "./RegulariseModal";
import RosterGrid from "./RosterGrid";
import SopGuide from "./SopGuide";
import {
  computeMonthlySummaries,
  downloadSampleExcelTemplate,
  evaluateAttendance,
  exportAttendanceExcel,
} from "./erpEngine";
import {
  SAMPLE_DAYS,
  SAMPLE_EMPLOYEES,
  SAMPLE_PUNCH_LOGS,
  SAMPLE_ROSTER_ENTRIES,
} from "./sampleData";
import type {
  AttendanceRecord,
  Employee,
  EmployeeGender,
  RosterEntry,
} from "./erpTypes";

type ErpTab = "attendance" | "roster" | "ledger" | "sop_guide";

export default function ErpPanel() {
  const [activeTab, setActiveTab] = useState<ErpTab>("attendance");
  const [selectedDate, setSelectedDate] = useState<string>("2026-09-28");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [regulariseRecord, setRegulariseRecord] = useState<AttendanceRecord | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize roster and employee data
  const [employees, setEmployees] = useState<Employee[]>(SAMPLE_EMPLOYEES);
  const [rosterEntries, setRosterEntries] = useState<RosterEntry[]>(SAMPLE_ROSTER_ENTRIES);

  // Compute initial attendance records using the SOP & User rules engine
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>(() => {
    return SAMPLE_EMPLOYEES.map((emp) => {
      // Find shift from roster for selected date
      const roster = SAMPLE_ROSTER_ENTRIES.find((r) => r.employeeId === emp.id);
      const scheduledShift = roster?.schedule[selectedDate] || emp.defaultShift;

      // Find punch log
      const punch = SAMPLE_PUNCH_LOGS.find(
        (p) => p.employeeId === emp.id && p.date === selectedDate,
      );

      return evaluateAttendance({
        employee: emp,
        date: selectedDate,
        scheduledShift,
        actualIn: punch ? punch.actualIn : null,
        actualOut: punch ? punch.actualOut : null,
        monthlyLateCountBeforeThis: punch ? punch.monthlyLateCountBeforeThis : 0,
      });
    });
  });

  // Re-calculate attendance when selectedDate changes (if using built-in roster)
  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setAttendanceRecords((prev) => {
      return employees.map((emp) => {
        const roster = rosterEntries.find((r) => r.employeeId === emp.id);
        const scheduledShift = roster?.schedule[newDate] || emp.defaultShift;

        const punch = SAMPLE_PUNCH_LOGS.find(
          (p) => p.employeeId === emp.id && p.date === newDate,
        );

        return evaluateAttendance({
          employee: emp,
          date: newDate,
          scheduledShift,
          actualIn: punch ? punch.actualIn : null,
          actualOut: punch ? punch.actualOut : null,
          monthlyLateCountBeforeThis: punch ? punch.monthlyLateCountBeforeThis : 0,
        });
      });
    });
  };

  // Handle manual regularisation
  const handleSaveRegularisation = (
    recordId: string,
    updatedIn: string,
    updatedOut: string,
    reason: string,
  ) => {
    setAttendanceRecords((prev) =>
      prev.map((rec) => {
        if (rec.id !== recordId) return rec;

        const emp = employees.find((e) => e.id === rec.employeeId) || {
          id: rec.employeeId,
          name: rec.employeeName,
          gender: rec.gender,
          role: rec.role,
        };

        return evaluateAttendance({
          employee: emp,
          date: rec.date,
          scheduledShift: rec.scheduledShift,
          actualIn: updatedIn,
          actualOut: updatedOut,
          monthlyLateCountBeforeThis: rec.monthlyLateCountBeforeThis,
          isRegularised: true,
          regularisationNote: reason,
        });
      }),
    );

    setNotification(`Successfully regularised punch for ${regulariseRecord?.employeeName}.`);
    setTimeout(() => setNotification(null), 4000);
  };

  // Handle newly uploaded Excel data
  const handleImportExcelData = (
    importedRows: Array<{
      name: string;
      gender: EmployeeGender;
      role: string;
      date: string;
      scheduledShift: string;
      actualIn: string;
      actualOut: string;
    }>,
  ) => {
    // Track monthly late counts per employee
    const lateCounterMap = new Map<string, number>();

    const newRecords: AttendanceRecord[] = importedRows.map((row, idx) => {
      const empId = `IMP-${idx + 1}`;
      const currentLateCount = lateCounterMap.get(row.name) || 0;

      const record = evaluateAttendance({
        employee: {
          id: empId,
          name: row.name,
          gender: row.gender,
          role: row.role,
        },
        date: row.date,
        scheduledShift: row.scheduledShift,
        actualIn: row.actualIn || null,
        actualOut: row.actualOut || null,
        monthlyLateCountBeforeThis: currentLateCount,
      });

      if (record.lateMinutes > 0 && record.lateMinutes <= 30) {
        lateCounterMap.set(row.name, currentLateCount + 1);
      }

      return record;
    });

    setAttendanceRecords(newRecords);
    if (importedRows[0]?.date) {
      setSelectedDate(importedRows[0].date);
    }
    setActiveTab("attendance");
    setNotification(
      `Successfully loaded and rule-evaluated ${newRecords.length} records from uploaded Excel sheet.`,
    );
    setTimeout(() => setNotification(null), 5000);
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    let presentPunctual = 0;
    let graceLate = 0;
    let halfDays = 0;
    let offOrLeave = 0;
    let safetyAlerts = 0;

    attendanceRecords.forEach((r) => {
      if (r.status === "PRESENT") presentPunctual++;
      else if (r.status === "PRESENT_GRACE_LATE") graceLate++;
      else if (r.status === "HALF_DAY") halfDays++;
      else if (r.status === "WEEKLY_OFF" || r.status === "LEAVE") offOrLeave++;

      if (r.isWomenSafetyAlert) safetyAlerts++;
    });

    return {
      total: attendanceRecords.length,
      presentPunctual,
      graceLate,
      halfDays,
      offOrLeave,
      safetyAlerts,
    };
  }, [attendanceRecords]);

  // Monthly Summaries for Ledger
  const monthlySummaries = useMemo(() => {
    return computeMonthlySummaries(employees, attendanceRecords);
  }, [employees, attendanceRecords]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Notification */}
      {notification && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-2xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span>{notification}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-emerald-600 hover:text-emerald-900"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
              SOP-11-02 Compliant ERP
            </span>
            <span className="text-xs font-medium text-slate-400">•</span>
            <span className="text-xs font-medium text-slate-500">
              Attendance Cycle: <strong>19th Sep – 18th Oct 2026</strong>
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-slate-900">
            Store Staff Roster &amp; Biometric ERP
          </h2>
          <p className="text-xs text-slate-500">
            Automated 30-min late grace tracking (3 days/mo limit), mandatory 9-hour shift verification, and weekly off gap management.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadSampleExcelTemplate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-100"
            title="Download blank sample Excel template with column formatting"
          >
            <span>📥</span> Sample Template
          </button>

          <button
            type="button"
            onClick={() => exportAttendanceExcel(attendanceRecords, selectedDate)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600"
          >
            <span>📊</span> Export Sheet
          </button>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            <span>📁</span> Upload Excel Sheet
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
          <span className="text-[11px] font-medium text-slate-500">Total Staff</span>
          <div className="mt-1 text-xl font-bold text-slate-900">{metrics.total}</div>
          <span className="text-[10px] text-slate-400">Rostered headcount</span>
        </div>

        <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700">Punctual &amp; Full 9h</span>
          <div className="mt-1 text-xl font-bold text-emerald-700">{metrics.presentPunctual}</div>
          <span className="text-[10px] text-emerald-600 font-medium">On time / &gt;=9.0 hrs</span>
        </div>

        <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700">Grace Late (&le;30m)</span>
          <div className="mt-1 text-xl font-bold text-amber-700">{metrics.graceLate}</div>
          <span className="text-[10px] text-amber-600 font-medium">Pardoned (Within 3/mo)</span>
        </div>

        <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-700">Half Days Marked</span>
          <div className="mt-1 text-xl font-bold text-rose-700">{metrics.halfDays}</div>
          <span className="text-[10px] text-rose-600 font-medium">4th Late or &lt;9h worked</span>
        </div>

        <div className="rounded-xl border border-yellow-200 bg-yellow-50/50 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-yellow-800">Off / Leave</span>
          <div className="mt-1 text-xl font-bold text-yellow-800">{metrics.offOrLeave}</div>
          <span className="text-[10px] text-yellow-700">Scheduled WO / FRM-01</span>
        </div>

        <div className="rounded-xl border border-pink-100 bg-pink-50/40 p-3.5 shadow-2xs">
          <span className="text-[11px] font-semibold text-pink-700">Women &gt;21:30</span>
          <div className="mt-1 text-xl font-bold text-pink-700">{metrics.safetyAlerts}</div>
          <span className="text-[10px] text-pink-600 font-medium">Store Cab Required</span>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "attendance"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            📋 Biometric &amp; Attendance ({attendanceRecords.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "roster"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            📅 Weekly Roster Matrix
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "ledger"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            📈 Monthly Grace &amp; Penalty Ledger
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("sop_guide")}
            className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
              activeTab === "sop_guide"
                ? "bg-blue-600 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            📖 SOP Rules &amp; Policies
          </button>
        </div>

        {activeTab === "attendance" && (
          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <span className="text-xs font-medium text-slate-500">Date:</span>
            <select
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
            >
              {SAMPLE_DAYS.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.label} ({d.dayName})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main Tab View Rendering */}
      <div>
        {activeTab === "attendance" && (
          <AttendanceTable
            records={attendanceRecords}
            onOpenRegularise={(rec) => setRegulariseRecord(rec)}
          />
        )}

        {activeTab === "roster" && (
          <RosterGrid entries={rosterEntries} days={SAMPLE_DAYS} />
        )}

        {activeTab === "ledger" && (
          <MonthlyLedger
            summaries={monthlySummaries}
            cycleLabel="19th Sep – 18th Oct 2026"
          />
        )}

        {activeTab === "sop_guide" && <SopGuide />}
      </div>

      {/* Modals */}
      {isUploadOpen && (
        <ExcelUploadModal
          onClose={() => setIsUploadOpen(false)}
          onImportSuccess={handleImportExcelData}
        />
      )}

      {regulariseRecord && (
        <RegulariseModal
          record={regulariseRecord}
          onClose={() => setRegulariseRecord(null)}
          onSave={handleSaveRegularisation}
        />
      )}
    </div>
  );
}
