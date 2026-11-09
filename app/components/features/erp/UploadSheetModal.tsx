"use client";

import { useState } from "react";
import UploadErrorList from "@/app/components/dashboard/UploadErrorList";
import { UploadIcon } from "@/app/components/dashboard/icons";
import type { UploadIssue } from "@/app/components/shared/api";
import { PUNCH_HEADERS, ROSTER_HEADERS } from "@/lib/erp/excel";
import { uploadSheet, type SheetKind } from "./erpApi";
import { downloadPunchTemplate, downloadRosterTemplate } from "./erpSheets";

interface UploadSheetModalProps {
  today: string;
  onClose: () => void;
  onUploaded: (message: string) => void;
}

const KINDS: Record<SheetKind, { title: string; help: string; columns: string }> = {
  roster: {
    title: "Weekly roster",
    help: "Creates or updates employees and their shifts. Empty cells leave that day as it is. Cells: a band like 10:45AM-7:45PM or 1-10PM, or WO / Leave / Holiday.",
    columns: `${ROSTER_HEADERS.join(" | ")} | one column per date (YYYY-MM-DD)`,
  },
  punches: {
    title: "Biometric punches",
    help: "The device export, one row per employee per day. Re-uploading a day replaces its reading; regularisations are kept. Upload the roster first.",
    columns: PUNCH_HEADERS.join(" | "),
  },
};

export default function UploadSheetModal({ today, onClose, onUploaded }: UploadSheetModalProps) {
  const [kind, setKind] = useState<SheetKind>("punches");
  const [uploading, setUploading] = useState(false);
  const [issues, setIssues] = useState<UploadIssue[]>([]);

  async function handleFile(file: File) {
    setUploading(true);
    setIssues([]);
    const result = await uploadSheet(kind, file);
    setUploading(false);
    if (result.ok) {
      onUploaded(result.summary);
      onClose();
    } else {
      setIssues(result.errors);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-base font-semibold text-slate-900">Upload Excel sheet</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 flex gap-1">
          {(Object.keys(KINDS) as SheetKind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind(k);
                setIssues([]);
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                kind === k ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {KINDS[k].title}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-600">{KINDS[kind].help}</p>
        <p className="mt-2 rounded-md bg-slate-50 px-2 py-1.5 font-mono text-[11px] text-slate-700">{KINDS[kind].columns}</p>

        <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
          <UploadIcon className="h-8 w-8 text-blue-500" />
          <span className="mt-2 text-sm font-semibold text-slate-700">
            {uploading ? "Uploading…" : `Choose the ${KINDS[kind].title.toLowerCase()} file (.xlsx)`}
          </span>
          <input
            type="file"
            accept=".xlsx"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>

        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => (kind === "roster" ? downloadRosterTemplate(today) : downloadPunchTemplate(today))}
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            Download {KINDS[kind].title.toLowerCase()} template
          </button>
        </div>

        {issues.length ? (
          <div className="mt-3 overflow-auto">
            <UploadErrorList issues={issues} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
