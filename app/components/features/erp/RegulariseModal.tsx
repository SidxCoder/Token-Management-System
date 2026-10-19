"use client";

import { useState } from "react";
import type { AttendanceRecord } from "./erpTypes";

interface RegulariseModalProps {
  record: AttendanceRecord;
  onClose: () => void;
  onSave: (recordId: string, updatedIn: string, updatedOut: string, reason: string) => void;
}

export default function RegulariseModal({ record, onClose, onSave }: RegulariseModalProps) {
  const [inTime, setInTime] = useState(record.actualIn || record.scheduledStart || "10:45");
  const [outTime, setOutTime] = useState(record.actualOut || record.scheduledEnd || "19:45");
  const [reason, setReason] = useState(
    record.regularisationNote || "Biometric failure / Outdoor duty approved under SOP-11-03",
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(record.id, inTime, outTime, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Regularise Punch / Exception
            </h3>
            <p className="text-xs text-slate-500">
              {record.employeeName} ({record.role}) • {record.date}
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
            <strong>Scheduled Shift:</strong> {record.scheduledShift} (
            {record.scheduledStart} to {record.scheduledEnd})
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700">Actual In Time</label>
              <input
                type="text"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                placeholder="e.g. 10:45 AM or 10:45"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Actual Out Time</label>
              <input
                type="text"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                placeholder="e.g. 07:45 PM or 19:45"
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Reason / SOP Exception Justification
            </label>
            <select
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
            >
              <option value="Biometric failure / machine error verified by Store Admin (SOP-11-03)">
                Biometric failure / machine error (SOP-11-03)
              </option>
              <option value="Outdoor duty / store event authorized by Operations Head">
                Outdoor duty / store event authorized by Operations Head
              </option>
              <option value="Manager on Duty exception approved within 24 hours">
                Manager on Duty exception approved within 24 hours
              </option>
              <option value="Grace period / transportation delay exception">
                Grace period / transportation delay exception
              </option>
            </select>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-hidden"
              placeholder="Additional comments..."
            />
          </div>

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
              className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700"
            >
              Approve Regularisation
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
