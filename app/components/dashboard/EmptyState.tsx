import type { ReactNode } from "react";

// The illustrated empty state used across tabs: a circular blue badge with an
// icon, a bold title, an optional two-line subtitle, and an optional action.
export default function EmptyState({
  icon,
  title,
  subtitle,
  action,
  full,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  full?: boolean;
}) {
  return (
    <div
      className={`grid place-items-center px-4 text-center ${full ? "h-full min-h-72" : "py-14"}`}
    >
      <div>
        <div className="mx-auto mb-5 grid h-20 w-20 place-items-center rounded-full bg-blue-50 text-blue-500">
          {icon}
        </div>
        <p className="text-base font-bold text-slate-900">{title}</p>
        {subtitle ? (
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-slate-500">{subtitle}</p>
        ) : null}
        {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
      </div>
    </div>
  );
}
