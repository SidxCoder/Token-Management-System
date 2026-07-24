"use client";

import { useEffect, useState } from "react";
import { statusLabel, type OrderStatus } from "@/app/components/shared/api";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import {
  CancelIcon,
  ClipboardChartIcon,
  PackingIcon,
  TicketIcon,
} from "@/app/components/dashboard/icons";

type Reports = {
  byStatus: Record<string, number>;
  tokens: { issuedToday: number; cancelledToday: number };
  deliveredToday: number;
};

// Daily stats and status breakdown (view_reports permission).
export default function ReportsPanel() {
  const [reports, setReports] = useState<Reports | null>(null);
  const [loaded, setLoaded] = useState(false);
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
      } finally {
        if (!cancelled) setLoaded(true);
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
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          icon={<TicketIcon className="h-6 w-6" />}
          label="Tokens issued today"
          value={reports?.tokens.issuedToday ?? "—"}
        />
        <Stat
          icon={<PackingIcon className="h-6 w-6" />}
          label="Delivered today"
          value={reports?.deliveredToday ?? "—"}
        />
        <Stat
          icon={<CancelIcon className="h-6 w-6" />}
          label="Cancelled today"
          value={reports?.tokens.cancelledToday ?? "—"}
        />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Orders by status</h2>
        <p className="mt-1 text-sm text-slate-500">
          Live count of every order grouped by its current status.
        </p>
        {!loaded ? (
          <Loader label="Loading reports…" />
        ) : Object.keys(byStatus).length ? (
          <div className="mt-4 divide-y divide-slate-100 rounded-xl border border-slate-200">
            {Object.entries(byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-600">
                  {statusLabel(status as OrderStatus)}
                </span>
                <span className="font-semibold text-slate-900">{count}</span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ClipboardChartIcon className="h-9 w-9" />}
            title="No orders yet."
            subtitle="Orders will appear here once data is available."
          />
        )}
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
