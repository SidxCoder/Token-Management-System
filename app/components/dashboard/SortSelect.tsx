"use client";

import { sortLabel, type SortKey } from "@/app/components/shared/api";

// Sort picker for a list pane. The chosen key is sent to /api/orders rather
// than applied locally — see the note on SortKey in shared/api.ts.
//
// `busy` marks a re-sort that has been asked for but not yet come back. The
// lists deliberately keep showing the previous rows while refetching (so
// navigating between tabs does not flicker), which without this indicator makes
// changing the sort look like nothing happened for the length of the round trip.
export default function SortSelect({
  value,
  options,
  onChange,
  busy = false,
}: {
  value: SortKey;
  options: SortKey[];
  onChange: (next: SortKey) => void;
  busy?: boolean;
}) {
  return (
    <label className="relative flex shrink-0 items-center gap-1.5">
      <span className="sr-only">Sort by</span>
      {busy ? (
        <span
          role="status"
          aria-label="Re-sorting"
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
        />
      ) : null}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
          busy
            ? "border-blue-200 bg-blue-50 text-blue-700"
            : "border-slate-200 bg-white text-slate-600"
        }`}
      >
        {options.map((key) => (
          <option key={key} value={key}>
            {sortLabel(key)}
          </option>
        ))}
      </select>
    </label>
  );
}
