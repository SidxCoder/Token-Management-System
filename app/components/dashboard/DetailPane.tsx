"use client";

import { useEffect } from "react";

// The two-pane screens put the detail panel in a `lg:grid-cols-2` grid, so below
// 1024px it collapsed to a single column and rendered *after* the entire order
// list — on a phone you had to scroll past every order to reach "Issue token".
//
// Above `lg` nothing changes: this is the same side-by-side pane as before. At
// phone width it becomes a full-screen layer over the list with a back button,
// shown only once something is selected.
export default function DetailPane({
  open,
  title,
  onClose,
  className = "",
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  // Escape closes the overlay, and the list behind it must not scroll while it
  // is open. Both are phone-only concerns, so they no-op at lg and above.
  useEffect(() => {
    if (!open) return;
    const isOverlay = () => window.matchMedia("(max-width: 1023px)").matches;
    if (!isOverlay()) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const base =
    "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:max-h-full lg:self-start lg:overflow-y-auto";

  // Not selected: hidden on phones, but the desktop pane still renders so the
  // empty state stays visible side by side.
  if (!open) {
    return <section className={`hidden lg:block ${base} ${className}`}>{children}</section>;
  }

  return (
    <section
      className={`fixed inset-0 z-40 overflow-y-auto rounded-none border-0 p-5 lg:static lg:z-auto lg:overflow-y-auto lg:rounded-2xl lg:border lg:p-6 ${base} ${className}`}
    >
      <button
        type="button"
        onClick={onClose}
        className="mb-4 -ml-1 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 lg:hidden"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
          <path
            d="M12.5 15.5 7 10l5.5-5.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to {title}
      </button>
      {children}
    </section>
  );
}
