"use client";

import { useEffect, useState } from "react";
import UserManagement from "./UserManagement";

type Reports = {
  byStatus: Record<string, number>;
  tokens: { issuedToday: number; cancelledToday: number };
  deliveredToday: number;
};

export default function AdminDashboard() {
  const [reports, setReports] = useState<Reports | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void (async () => {
        const res = await fetch("/api/admin/reports");
        if (!res.ok) return;
        const data = (await res.json()) as Reports;
        setReports(data);
      })();
    }, 0);
    return () => {
      window.clearTimeout(initial);
    };
  }, []);

  async function uploadExcel(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/orders/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          Array.isArray(data.errors) && data.errors[0]?.message
            ? data.errors[0].message
            : (data.error ?? "Upload failed");
        throw new Error(msg);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Import orders</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Admin can import the Excel sheet here. Packager has the same permission.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            {uploading ? "Uploading…" : "Upload Excel"}
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadExcel(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {uploadError}
          </p>
        ) : null}
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Tokens issued today"
          value={reports?.tokens.issuedToday ?? "—"}
        />
        <Stat
          label="Delivered today"
          value={reports?.deliveredToday ?? "—"}
        />
        <Stat
          label="Cancelled today"
          value={reports?.tokens.cancelledToday ?? "—"}
        />
      </div>
      <UserManagement />
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
