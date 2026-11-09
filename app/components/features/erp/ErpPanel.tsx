"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import { DocumentIcon } from "@/app/components/dashboard/icons";
import { addDays, storeToday } from "@/lib/erp/time";
import AttendanceTable, { type AttendanceRow } from "./AttendanceTable";
import { freezeCycle, getAttendance, type AttendanceResponse } from "./erpApi";
import { cycleLabel, datesBetween, dayLabel, needsWomenSafety } from "./erpFormat";
import { exportCycleAttendance } from "./erpSheets";
import MonthlyLedger from "./MonthlyLedger";
import RegularisationQueue from "./RegularisationQueue";
import RegulariseModal from "./RegulariseModal";
import RosterGrid from "./RosterGrid";
import SopGuide from "./SopGuide";
import UploadSheetModal from "./UploadSheetModal";

type ErpTab = "attendance" | "roster" | "ledger" | "regularisations" | "rules";

const TABS: { id: ErpTab; label: string }[] = [
  { id: "attendance", label: "Daily attendance" },
  { id: "roster", label: "Weekly roster" },
  { id: "ledger", label: "Cycle ledger" },
  { id: "regularisations", label: "Regularisations" },
  { id: "rules", label: "Rules" },
];

export default function ErpPanel() {
  const [today] = useState(storeToday);
  const [tab, setTab] = useState<ErpTab>("attendance");
  // Any date inside the cycle being viewed.
  const [cycleDate, setCycleDate] = useState(today);
  const [data, setData] = useState<AttendanceResponse | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [regulariseRow, setRegulariseRow] = useState<AttendanceRow | null>(null);
  const [rosterKey, setRosterKey] = useState(0);
  const [confirmFreeze, setConfirmFreeze] = useState(false);
  const [freezing, setFreezing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const next = await getAttendance(cycleDate);
      setData(next);
      // Keep the chosen day if it's still in range, else jump to the latest.
      setSelectedDay((day) =>
        day && next.evaluatedThrough && day >= next.cycle.start && day <= next.evaluatedThrough
          ? day
          : next.evaluatedThrough,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load attendance");
    }
  }, [cycleDate]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  function announce(message: string) {
    setNotice(message);
    void load();
  }

  function goToCycle(date: string) {
    setData(null);
    setSelectedDay(null);
    setConfirmFreeze(false);
    setCycleDate(date);
  }

  async function handleFreeze() {
    if (!data) return;
    setFreezing(true);
    setError(null);
    try {
      const r = await freezeCycle(data.cycle.start);
      setConfirmFreeze(false);
      announce(`Froze ${cycleLabel(r.start, r.end)} for ${r.employees} employee(s). It can no longer be changed.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to freeze cycle");
    } finally {
      setFreezing(false);
    }
  }

  const days = useMemo(
    () => (data?.evaluatedThrough ? datesBetween(data.cycle.start, data.evaluatedThrough) : []),
    [data],
  );

  const rows: AttendanceRow[] = useMemo(
    () =>
      (data?.employees ?? []).flatMap(({ employee, days: ds }) => {
        const day = ds.find((d) => d.date === selectedDay);
        return day ? [{ employee, day }] : [];
      }),
    [data, selectedDay],
  );

  const metrics = useMemo(() => {
    const count = (pred: (r: AttendanceRow) => boolean) => rows.filter(pred).length;
    return [
      { label: "Rostered", value: rows.length, tone: "border-slate-200 text-slate-900" },
      { label: "Present", value: count((r) => r.day.outcome === "PRESENT"), tone: "border-emerald-100 bg-emerald-50/40 text-emerald-700" },
      {
        label: "Late (no deduction) / excused",
        value: count((r) => r.day.outcome === "LATE" || r.day.outcome === "EXCUSED"),
        tone: "border-amber-100 bg-amber-50/40 text-amber-700",
      },
      {
        label: "Half / full day deducted",
        value: count((r) => r.day.deduction === "HALF_LEAVE" || r.day.deduction === "FULL_LEAVE"),
        tone: "border-rose-100 bg-rose-50/40 text-rose-700",
      },
      {
        label: "Absent / missed punch",
        value: count((r) => r.day.outcome === "ABSENT" || r.day.outcome === "MISSED_PUNCH_PENDING"),
        tone: "border-red-200 bg-red-50/50 text-red-800",
      },
      {
        label: "Women after 21:30",
        value: count((r) => needsWomenSafety(r.employee.gender, r.day)),
        tone: "border-pink-100 bg-pink-50/40 text-pink-700",
      },
    ];
  }, [rows]);

  const frozen = data?.cycle.status === "FROZEN";
  const canFreeze = data?.cycle.status === "OPEN" && data.asOf > data.cycle.end;
  const navButton =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50";

  return (
    <div className="flex flex-col gap-6">
      {notice ? (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <span>✓ {notice}</span>
          <button type="button" onClick={() => setNotice(null)} className="text-emerald-600 hover:text-emerald-900">
            ✕
          </button>
        </div>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={navButton} onClick={() => data && goToCycle(addDays(data.cycle.start, -1))}>
              ←
            </button>
            <h2 className="text-lg font-bold text-slate-900">
              {data ? cycleLabel(data.cycle.start, data.cycle.end) : "Attendance cycle"}
            </h2>
            <button type="button" className={navButton} onClick={() => data && goToCycle(addDays(data.cycle.end, 1))}>
              →
            </button>
            {data ? (
              <span
                className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                  frozen ? "bg-slate-200 text-slate-700" : "bg-blue-100 text-blue-700"
                }`}
              >
                {frozen ? "Frozen" : "Open"}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {frozen
              ? "Frozen for payroll — this cycle can no longer be changed."
              : data?.evaluatedThrough
                ? `Calculated through ${dayLabel(data.evaluatedThrough)}, the last day with uploaded punches.`
                : "No punches uploaded for this cycle yet."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canFreeze ? (
            confirmFreeze ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1">
                <span className="text-xs font-semibold text-rose-800">Freeze for payroll? This can&apos;t be undone.</span>
                <button
                  type="button"
                  onClick={() => setConfirmFreeze(false)}
                  className="rounded-md px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={freezing}
                  onClick={() => void handleFreeze()}
                  className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  {freezing ? "Freezing…" : "Freeze"}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmFreeze(true)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-2xs hover:bg-rose-50"
              >
                Freeze cycle
              </button>
            )
          ) : null}
          <button
            type="button"
            disabled={!data?.employees.length}
            onClick={() => data && exportCycleAttendance(data)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-50"
          >
            Export cycle (.xlsx)
          </button>
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
          >
            Upload sheet
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition ${
                tab === t.id ? "bg-blue-600 text-white shadow-2xs" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "attendance" && days.length ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500">Day:</span>
            <select
              value={selectedDay ?? ""}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-2xs focus:border-blue-500 focus:outline-hidden"
            >
              {[...days].reverse().map((d) => (
                <option key={d} value={d}>
                  {dayLabel(d)}
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {tab === "attendance" ? (
        data === null ? (
          <Loader label="Loading attendance…" />
        ) : !days.length ? (
          <EmptyState
            icon={<DocumentIcon className="h-6 w-6" />}
            title="Nothing to show yet"
            subtitle="Upload the roster, then the biometric punch sheet, to see this cycle's attendance."
          />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {metrics.map((m) => (
                <div key={m.label} className={`rounded-xl border bg-white p-3.5 shadow-2xs ${m.tone}`}>
                  <span className="text-[11px] font-semibold">{m.label}</span>
                  <div className="mt-1 text-xl font-bold">{m.value}</div>
                </div>
              ))}
            </div>
            <AttendanceTable rows={rows} onRegularise={frozen ? null : setRegulariseRow} />
          </div>
        )
      ) : null}

      {tab === "roster" ? <RosterGrid initialFrom={selectedDay ?? today} refreshKey={rosterKey} /> : null}

      {tab === "ledger" ? (
        data === null ? (
          <Loader label="Loading ledger…" />
        ) : (
          <MonthlyLedger employees={data.employees} cycleLabel={cycleLabel(data.cycle.start, data.cycle.end)} />
        )
      ) : null}

      {tab === "regularisations" ? (
        <RegularisationQueue cycleDate={cycleDate} frozen={frozen} onDecided={announce} />
      ) : null}

      {tab === "rules" ? <SopGuide /> : null}

      {uploadOpen ? (
        <UploadSheetModal
          today={today}
          onClose={() => setUploadOpen(false)}
          onUploaded={(message) => {
            setRosterKey((k) => k + 1);
            announce(message);
          }}
        />
      ) : null}

      {regulariseRow ? (
        <RegulariseModal row={regulariseRow} onClose={() => setRegulariseRow(null)} onSubmitted={announce} />
      ) : null}
    </div>
  );
}
