import type { UploadIssue } from "@/app/components/shared/api";

function location(issue: UploadIssue): string | null {
  if (issue.row > 0) return `${issue.sheet} · row ${issue.row}`;
  if (issue.sheet && issue.sheet !== "-") return issue.sheet;
  return null;
}

// Shows every upload validation error at once. Import is all-or-nothing, so the
// heading makes clear that nothing was saved when there are issues.
export default function UploadErrorList({ issues }: { issues: UploadIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-800">
        {issues.length} issue{issues.length === 1 ? "" : "s"} found — nothing was imported
      </p>
      <ul className="mt-2 max-h-64 space-y-1.5 overflow-auto pr-1 text-sm text-red-700">
        {issues.map((issue, i) => {
          const loc = location(issue);
          return (
            <li key={i} className="flex flex-wrap gap-x-2">
              {loc ? (
                <span className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs text-red-800">
                  {loc}
                </span>
              ) : null}
              <span>{issue.message}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
