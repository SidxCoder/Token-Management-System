"use client";

import { useState } from "react";
import { downloadSampleExcelTemplate, parseUploadedExcel } from "./erpEngine";
import type { EmployeeGender } from "./erpTypes";

interface ExcelUploadModalProps {
  onClose: () => void;
  onImportSuccess: (
    importedRows: Array<{
      name: string;
      gender: EmployeeGender;
      role: string;
      date: string;
      scheduledShift: string;
      actualIn: string;
      actualOut: string;
    }>,
  ) => void;
}

export default function ExcelUploadModal({ onClose, onImportSuccess }: ExcelUploadModalProps) {
  const [parsing, setParsing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<
    Array<{
      name: string;
      gender: EmployeeGender;
      role: string;
      date: string;
      scheduledShift: string;
      actualIn: string;
      actualOut: string;
    }>
  >([]);
  const [errors, setErrors] = useState<string[]>([]);

  const handleFileChange = async (file: File) => {
    setFileName(file.name);
    setParsing(true);
    setErrors([]);
    try {
      const result = await parseUploadedExcel(file);
      if (result.errors.length > 0) {
        setErrors(result.errors);
      }
      setPreviewRows(result.records);
    } catch {
      setErrors(["Failed to read the Excel file. Please ensure it is a valid .xlsx or .xls file."]);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (previewRows.length === 0) return;
    onImportSuccess(previewRows);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Upload ERP / Biometric Excel Sheet
            </h3>
            <p className="text-xs text-slate-500">
              Upload employee shift schedules and biometric in/out logs to automatically calculate
              attendance and policy compliance.
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

        {/* Upload Dropzone */}
        <div className="mt-4 flex flex-col gap-3">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-6 text-center transition hover:border-blue-400 hover:bg-blue-50/40">
            <svg
              className="h-10 w-10 text-blue-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.8}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="mt-2 text-sm font-semibold text-slate-700">
              {fileName ? fileName : "Click to select or drag & drop an Excel file (.xlsx, .xls)"}
            </span>
            <span className="mt-1 text-xs text-slate-400">
              Supports standard store roster or biometric daily punch logs
            </span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileChange(file);
                e.target.value = "";
              }}
            />
          </label>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Need the official template?</span>
            <button
              type="button"
              onClick={downloadSampleExcelTemplate}
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
            >
              📥 Download Sample Excel Template
            </button>
          </div>
        </div>

        {/* Error alerts */}
        {errors.length > 0 ? (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <div className="font-semibold">Import Warnings:</div>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {/* Preview Table */}
        {parsing ? (
          <div className="my-8 text-center text-sm text-slate-500">
            Parsing Excel rows and validating headers...
          </div>
        ) : previewRows.length > 0 ? (
          <div className="mt-4 flex-1 overflow-hidden rounded-xl border border-slate-200">
            <div className="bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700">
              Previewing {previewRows.length} Parsed Records
            </div>
            <div className="max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr className="border-b border-slate-200">
                    <th className="px-3 py-2">Name</th>
                    <th className="px-2 py-2">Gender</th>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Scheduled Shift</th>
                    <th className="px-2 py-2">In Time</th>
                    <th className="px-2 py-2">Out Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {previewRows.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      <td className="px-3 py-1.5 font-medium text-slate-900">{row.name}</td>
                      <td className="px-2 py-1.5">{row.gender}</td>
                      <td className="px-3 py-1.5 text-slate-600">{row.role}</td>
                      <td className="px-3 py-1.5">{row.date}</td>
                      <td className="px-3 py-1.5">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px]">
                          {row.scheduledShift}
                        </span>
                      </td>
                      <td className="px-2 py-1.5 text-slate-700">{row.actualIn || "--"}</td>
                      <td className="px-2 py-1.5 text-slate-700">{row.actualOut || "--"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {previewRows.length > 15 ? (
              <div className="bg-slate-50 px-3 py-1.5 text-center text-[11px] text-slate-400">
                ...and {previewRows.length - 15} more rows
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Footer actions */}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={previewRows.length === 0}
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 disabled:opacity-50"
          >
            Import {previewRows.length > 0 ? `(${previewRows.length} Rows)` : ""} & Run Rule Engine
          </button>
        </div>
      </div>
    </div>
  );
}
