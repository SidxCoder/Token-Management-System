import { BellIcon } from "./icons";

export default function TabHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-7 flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Notifications"
        className="relative grid h-10 w-10 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
      >
        <BellIcon className="h-5 w-5" />
        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-blue-600" />
      </button>
    </div>
  );
}
