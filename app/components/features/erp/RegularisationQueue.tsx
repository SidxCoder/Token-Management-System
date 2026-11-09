"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import { DocumentIcon } from "@/app/components/dashboard/icons";
import {
  decideRegularisation,
  listRegularisations,
  type RegularisationRow,
  type RegularisationStatus,
} from "./erpApi";
import { clock, dayLabel, REGULARISATION_LABEL } from "./erpFormat";

interface RegularisationQueueProps {
  // Any date in the cycle to list.
  cycleDate: string;
  frozen: boolean;
  // Called after a decision so attendance can be recomputed.
  onDecided: (message: string) => void;
}

const STATUSES: RegularisationStatus[] = ["PENDING", "APPROVED", "REJECTED"];

export default function RegularisationQueue({ cycleDate, frozen, onDecided }: RegularisationQueueProps) {
  const [status, setStatus] = useState<RegularisationStatus>("PENDING");
  const [rows, setRows] = useState<RegularisationRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      setRows((await listRegularisations(status, cycleDate)).regularisations);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load requests");
    }
  }, [status, cycleDate]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function decide(r: RegularisationRow, decision: "APPROVE" | "REJECT") {
    setBusyId(r.id);
    setError(null);
    try {
      await decideRegularisation(r.id, decision);
      onDecided(`${decision === "APPROVE" ? "Approved" : "Rejected"} ${r.employee.name}'s request for ${dayLabel(r.date)}.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save decision");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Regularisation requests</h3>
          <p className="text-xs text-slate-500">
            A request must be decided by a different admin from the one who entered it. Pending requests block the
            cycle freeze.
          </p>
        </div>
        <div className="flex gap-1">
          {STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                status === s ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {s[0] + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      {rows === null ? (
        <Loader label="Loading requests…" />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<DocumentIcon className="h-6 w-6" />}
          title={`No ${status.toLowerCase()} requests`}
          subtitle="Use Regularise on a day in the attendance tab to enter one."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-semibold text-slate-600">
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-3 py-3">Day</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Corrected times</th>
                  <th className="px-3 py-3">Note</th>
                  <th className="px-3 py-3">Entered by</th>
                  <th className="px-4 py-3 text-right">{status === "PENDING" ? "Decision" : "Decided by"}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id} className="align-top transition hover:bg-slate-50/70">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-slate-900">{r.employee.name}</span>
                      <span className="block text-[11px] text-slate-400">{r.employee.emp_code}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-700">{dayLabel(r.date)}</td>
                    <td className="px-3 py-3 text-slate-700">{REGULARISATION_LABEL[r.type]}</td>
                    <td className="px-3 py-3 font-mono text-slate-700">
                      {r.inMin === null ? "—" : `${clock(r.inMin)} – ${clock(r.outMin)}`}
                    </td>
                    <td className="max-w-xs px-3 py-3 text-slate-600">{r.note}</td>
                    <td className="px-3 py-3 text-slate-600">
                      {r.requestedBy}
                      <span className="block text-[11px] text-slate-400">
                        {new Date(r.requestedAt).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status !== "PENDING" ? (
                        <span className="text-slate-600">{r.decidedBy}</span>
                      ) : frozen ? (
                        <span className="text-slate-400">Cycle frozen</span>
                      ) : r.canDecide ? (
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void decide(r, "REJECT")}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            type="button"
                            disabled={busyId === r.id}
                            onClick={() => void decide(r, "APPROVE")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">Awaiting another admin</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
