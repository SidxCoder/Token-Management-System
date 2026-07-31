// Shown the instant a tab is clicked, while the page's server component runs its
// query. Without this the router waits for the whole RSC response before painting
// anything, so a navigation looked like a dead click for as long as the query
// took. One file covers every dashboard tab; the sidebar in layout.tsx stays put,
// only this content area is replaced.
//
// The shape mirrors the two-pane screens — header, list card, detail card — so
// the real page drops into the same layout instead of shifting it.
export default function DashboardLoading() {
  return (
    <div
      className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col"
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>

      <div className="shrink-0">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="grid items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:items-stretch">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:min-h-0 lg:flex-col">
          <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
          <div className="mt-4 h-11 w-full animate-pulse rounded-lg bg-slate-100" />
          <div className="mt-5 space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="animate-pulse rounded-xl border border-slate-200 p-4"
                // Rows fade out down the list so the placeholder reads as
                // "more below" rather than a solid block.
                style={{ opacity: 1 - i * 0.15 }}
              >
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="mt-2 h-3 w-52 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </section>

        <section className="hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:block lg:max-h-full lg:self-start">
          <div className="h-3 w-24 animate-pulse rounded bg-slate-100" />
          <div className="mt-3 h-6 w-48 animate-pulse rounded bg-slate-200" />
          <div className="mt-6 space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex justify-between gap-4">
                <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
