// Centered spinner shown while a screen loads its data for the first time, so
// screens don't flash an empty state before the initial fetch resolves.
export default function Loader({
  label = "Loading…",
  full,
}: {
  label?: string;
  full?: boolean;
}) {
  return (
    <div
      className={`grid place-items-center px-4 text-center ${full ? "h-full min-h-72" : "py-14"}`}
    >
      <div className="flex flex-col items-center gap-3">
        <span
          role="status"
          aria-label={label}
          className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600"
        />
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}
