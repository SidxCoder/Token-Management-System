"use client";

import { useCallback, useEffect, useState } from "react";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import { DocumentIcon } from "@/app/components/dashboard/icons";

type AuditEntry = {
  id: string;
  at: string;
  username: string;
  role: string;
  action: string;
  details: unknown;
  order_ref: { order_id: string } | null;
};

type AuditResponse = {
  entries: AuditEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

// Read-only audit log with filters and pagination (view_audit permission).
export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ action: "", username: "", orderId: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sp = new URLSearchParams({ page: String(page) });
      if (filters.action.trim()) sp.set("action", filters.action.trim());
      if (filters.username.trim()) sp.set("username", filters.username.trim());
      if (filters.orderId.trim()) sp.set("orderId", filters.orderId.trim());
      const res = await fetch(`/api/admin/audit?${sp.toString()}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to load audit log");
      const payload = data as AuditResponse;
      setEntries(payload.entries ?? []);
      setTotalPages(payload.totalPages ?? 0);
      setTotal(payload.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  function applyFilters(event: React.FormEvent) {
    event.preventDefault();
    setPage(1);
  }

  function clearFilters() {
    setFilters({ action: "", username: "", orderId: "" });
    setPage(1);
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={applyFilters}
        className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-4"
      >
        <Field
          label="Action"
          value={filters.action}
          onChange={(action) => setFilters((f) => ({ ...f, action }))}
          placeholder="e.g. deliver"
        />
        <Field
          label="Username"
          value={filters.username}
          onChange={(username) => setFilters((f) => ({ ...f, username }))}
          placeholder="e.g. anaya"
        />
        <Field
          label="Order id"
          value={filters.orderId}
          onChange={(orderId) => setFilters((f) => ({ ...f, orderId }))}
          placeholder="Exact order id"
        />
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Filter
          </button>
          <button
            type="button"
            onClick={clearFilters}
            className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear
          </button>
        </div>
      </form>

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[760px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Time</th>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Action</th>
              <th className="px-5 py-3.5">Order</th>
              <th className="px-5 py-3.5">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-6">
                  <Loader />
                </td>
              </tr>
            ) : entries.length ? (
              entries.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {new Date(entry.at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-5 py-4 font-medium text-slate-700">{entry.username}</td>
                  <td className="px-5 py-4 text-slate-500">{entry.role}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs text-slate-500">
                    {entry.order_ref?.order_id ?? "—"}
                  </td>
                  <td className="max-w-xs px-5 py-4 text-xs text-slate-500">
                    {entry.details != null ? (
                      <code className="block whitespace-pre-wrap break-words">
                        {JSON.stringify(entry.details)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-6">
                  <EmptyState
                    icon={<DocumentIcon className="h-9 w-9" />}
                    title="No audit entries found."
                    subtitle="Try adjusting your filters or check back later."
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <p>
          {total} entr{total === 1 ? "y" : "ies"}
          {totalPages > 0 ? ` · page ${page} of ${totalPages}` : ""}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
