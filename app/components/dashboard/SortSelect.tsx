"use client";

import { sortLabel, type SortKey } from "@/app/components/shared/api";

// Sort picker for a list pane. The chosen key is sent to /api/orders rather
// than applied locally — see the note on SortKey in shared/api.ts.
export default function SortSelect({
  value,
  options,
  onChange,
}: {
  value: SortKey;
  options: SortKey[];
  onChange: (next: SortKey) => void;
}) {
  return (
    <label className="shrink-0">
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SortKey)}
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
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
