"use client";

import { useState } from "react";
import { uploadOrders, type UploadIssue } from "@/app/components/shared/api";
import UploadErrorList from "@/app/components/dashboard/UploadErrorList";
import { CloudUploadIcon, UploadIcon } from "@/app/components/dashboard/icons";

// Excel import, shared by packager and admin (upload_excel permission).
export default function ImportOrders() {
  const [uploading, setUploading] = useState(false);
  const [issues, setIssues] = useState<UploadIssue[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setIssues([]);
    setMessage(null);
    const result = await uploadOrders(file);
    if (result.ok) {
      setMessage(
        `Imported ${result.orders} order${result.orders === 1 ? "" : "s"} (${result.items} item${result.items === 1 ? "" : "s"}).`,
      );
    } else {
      setIssues(result.errors);
    }
    setUploading(false);
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <CloudUploadIcon className="h-6 w-6" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-900">Import orders</h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload the Excel sheet to load new orders into the system.
            </p>
          </div>
        </div>
        <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
          <UploadIcon className="h-4 w-4" />
          {uploading ? "Uploading…" : "Upload Excel"}
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            disabled={uploading}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      {issues.length ? (
        <div className="mt-4">
          <UploadErrorList issues={issues} />
        </div>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}
    </section>
  );
}
