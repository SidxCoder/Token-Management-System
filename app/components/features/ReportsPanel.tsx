"use client";

import { useEffect, useState } from "react";
import { statusLabel, type OrderStatus } from "@/app/components/shared/api";

type Reports = {
  byStatus: Record<string, number>;
  tokens: { issuedToday: number; cancelledToday: number };
  deliveredToday: number;
};

// Daily stats and status breakdown (view_reports permission).
export default function ReportsPanel() {
  const [reports, setReports] = useState<Reports | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/reports");
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Failed to load reports");
        if (!cancelled) setReports(data as Reports);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load reports");
      }
    }
    void load();
    const id = window.setInterval(() => void load(), 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const byStatus = reports?.byStatus ?? {};

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Tokens issued today" value={reports?.tokens.issuedToday ?? "—"} />
        <Stat label="Delivered today" value={reports?.deliveredToday ?? "—"} />
        <Stat label="Cancelled today" value={reports?.tokens.cancelledToday ?? "—"} />
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Orders by status</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Live count of every order grouped by its current status.
        </p>
        <div className="mt-4 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
          {Object.keys(byStatus).length ? (
            Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-zinc-700">
                  {statusLabel(status as OrderStatus)}
                </span>
                <span className="font-semibold text-zinc-900">{count}</span>
              </div>
            ))
          ) : (
            <p className="px-4 py-8 text-center text-sm text-zinc-500">
              No orders yet.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
