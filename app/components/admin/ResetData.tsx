"use client";

import { useState } from "react";
import { WarningIcon } from "@/app/components/dashboard/icons";

// Must match app/api/admin/reset/route.ts exactly — the server re-checks both.
// Case-sensitive on purpose.
const STEP_ONE = "DELETE";
const STEP_TWO = "CONFIRM";

type Result = {
  orders_removed: number;
  tokens_removed: number;
  accounts_removed: number;
};

// Erases every order, token, session and non-admin account. Two typed
// confirmations rather than one, because a single "are you sure?" is exactly the
// dialog people dismiss without reading — and this cannot be undone.
export default function ResetData() {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [first, setFirst] = useState("");
  const [second, setSecond] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Result | null>(null);

  const firstOk = first.trim() === STEP_ONE;
  const secondOk = second.trim() === STEP_TWO;

  function cancel() {
    setStep(0);
    setFirst("");
    setSecond("");
    setError(null);
  }

  async function run() {
    if (!firstOk || !secondOk) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ first: first.trim(), second: second.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setDone(data as Result);
      cancel();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {done ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900">Data reset complete.</p>
          <p className="mt-1 text-sm text-emerald-800">
            Removed {done.orders_removed} orders, {done.tokens_removed} tokens and{" "}
            {done.accounts_removed} non-admin accounts. Token numbering restarts
            at #1. You are still signed in.
          </p>
          <button
            onClick={() => setDone(null)}
            className="mt-3 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <section className="rounded-2xl border border-rose-200 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
            <WarningIcon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Reset all data</h2>
            <p className="mt-1 text-sm text-slate-500">
              Permanently erases every order, order line, token, audit entry and
              staff account. This cannot be undone and there is no backup.
            </p>
          </div>
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-rose-600">
              Erased
            </dt>
            <dd className="mt-2 text-sm text-slate-700">
              Orders · Order lines · Tokens · Audit log · All non-admin accounts
            </dd>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <dt className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
              Kept
            </dt>
            <dd className="mt-2 text-sm text-slate-700">
              Every admin login, including yours — you stay signed in
            </dd>
          </div>
        </dl>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {step === 0 ? (
          <button
            onClick={() => setStep(1)}
            className="mt-5 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Reset all data
          </button>
        ) : null}

        {step === 1 ? (
          <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-900">Step 1 of 2</p>
            <p className="mt-1 text-sm text-rose-800">
              Type <span className="font-mono font-bold">{STEP_ONE}</span> to
              continue — capitals included.
            </p>
            <input
              autoFocus
              value={first}
              onChange={(event) => setFirst(event.target.value)}
              placeholder={STEP_ONE}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="mt-3 w-full rounded-lg border border-rose-200 bg-white px-3 py-2.5 font-mono text-sm tracking-widest text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={() => setStep(2)}
                disabled={!firstOk}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Continue
              </button>
              <button
                onClick={cancel}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="mt-5 rounded-xl border-2 border-rose-400 bg-rose-50 p-4">
            <p className="text-sm font-semibold text-rose-900">Step 2 of 2 — last chance</p>
            <p className="mt-1 text-sm text-rose-800">
              Type <span className="font-mono font-bold">{STEP_TWO}</span> to
              erase everything now — capitals included.
            </p>
            <input
              autoFocus
              value={second}
              onChange={(event) => setSecond(event.target.value)}
              placeholder={STEP_TWO}
              autoCapitalize="characters"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              className="mt-3 w-full rounded-lg border border-rose-300 bg-white px-3 py-2.5 font-mono text-sm tracking-widest text-slate-900 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
            <div className="mt-3 flex gap-3">
              <button
                onClick={run}
                disabled={!secondOk || busy}
                className="rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {busy ? "Erasing…" : "Erase all data"}
              </button>
              <button
                onClick={cancel}
                disabled={busy}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
