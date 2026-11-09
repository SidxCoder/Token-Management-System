"use client";

import { useState } from "react";
import type { RegularisationType } from "@/lib/erp/types";
import type { AttendanceRow } from "./AttendanceTable";
import { createRegularisation } from "./erpApi";
import { clock24, dayLabel, REGULARISATION_LABEL, shiftLabel } from "./erpFormat";

interface RegulariseModalProps {
  row: AttendanceRow;
  onClose: () => void;
  onSubmitted: (message: string) => void;
}

const HELP: Record<RegularisationType, string> = {
  MISSED_PUNCH: "One punch is missing. Within 48 h, with manager confirmation. Max 3 per cycle; 3 missed punches bring a caution.",
  DEVICE_FAILURE: "The biometric device didn't record the day. Same-day email to the Reporting Manager; Store Admin verifies.",
  OUTDOOR_DUTY: "Client visit, kiosk, pop-up or office meeting. Same-day email with location, purpose and times.",
  TIME_EXCEPTION:
    "Employee told the manager before the shift. Excuses a late or early of up to 30 min (not the 10:45 shift). Max 3 per cycle.",
};

export default function RegulariseModal({ row, onClose, onSubmitted }: RegulariseModalProps) {
  const { employee, day } = row;
  const oneMissing = (day.inMin === null) !== (day.outMin === null);
  const [type, setType] = useState<RegularisationType>(oneMissing ? "MISSED_PUNCH" : "TIME_EXCEPTION");
  const [inTime, setInTime] = useState(clock24(day.inMin ?? day.startMin));
  const [outTime, setOutTime] = useState(clock24(day.outMin ?? day.endMin));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const needsTimes = type !== "TIME_EXCEPTION";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await createRegularisation({
        employeeId: employee.id,
        date: day.date,
        type,
        note: note.trim(),
        ...(needsTimes ? { inTime, outTime } : {}),
      });
      onSubmitted(`Request sent for ${employee.name} (${dayLabel(day.date)}). Another admin must approve it.`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSaving(false);
    }
  }

  const input =
    "mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Request regularisation</h3>
            <p className="text-xs text-slate-500">
              {employee.name} ({employee.emp_code}) · {dayLabel(day.date)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-800">
            <strong>Shift:</strong> {shiftLabel({ kind: "SHIFT", startMin: day.startMin, endMin: day.endMin })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Reason</label>
            <select value={type} onChange={(e) => setType(e.target.value as RegularisationType)} className={input}>
              {(Object.keys(REGULARISATION_LABEL) as RegularisationType[]).map((t) => (
                <option key={t} value={t}>
                  {REGULARISATION_LABEL[t]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-slate-500">{HELP[type]}</p>
          </div>

          {needsTimes ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Correct in-time</label>
                <input type="time" value={inTime} onChange={(e) => setInTime(e.target.value)} className={input} required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Correct out-time</label>
                <input type="time" value={outTime} onChange={(e) => setOutTime(e.target.value)} className={input} required />
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-slate-700">Note / evidence</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              required
              placeholder="e.g. Manager confirmed by email at 10:20; device log shows no reading"
              className={input}
            />
          </div>

          <p className="text-[11px] text-slate-500">
            Corrected times are still checked for lateness — a regularisation fixes the record, it doesn&apos;t
            pardon the day.
          </p>

          {error ? (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Sending…" : "Send for approval"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
