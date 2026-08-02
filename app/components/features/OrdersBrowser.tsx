"use client";

import { useCallback, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  statusLabel,
  statusFirst,
  statusSorts,
  ALL_STATUSES,
  PAGE_STEP,
  type Order,
  type SortKey,
} from "@/app/components/shared/api";
import { useDebounced } from "@/app/components/shared/useDebounced";
import { useActionError } from "@/app/components/shared/useActionError";
import { useInfiniteScroll } from "@/app/components/shared/useInfiniteScroll";
import { usePolling } from "@/app/components/shared/usePolling";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import SortSelect from "@/app/components/dashboard/SortSelect";
import DetailPane from "@/app/components/dashboard/DetailPane";
import {
  ClipboardIcon,
  DocumentSearchIcon,
  SearchIcon,
} from "@/app/components/dashboard/icons";

const SORT_OPTIONS: SortKey[] = [...statusSorts(ALL_STATUSES), "name"];

// Read-only order search available to every role (search_orders permission).
export default function OrdersBrowser({
  initialOrders = [],
  initialTotal = 0,
}: {
  // Server-rendered first screenful. Without it the page paints, then the
  // browser makes a second cross-region round trip before anything shows.
  initialOrders?: Order[];
  initialTotal?: number;
} = {}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrders[0]?.order_id ?? null,
  );
  // Read-only screen: no user actions, so only load errors are possible here.
  const { error, setLoadError, clearLoadError } = useActionError();
  const [loading, setLoading] = useState(initialOrders.length === 0);
  const [sort, setSort] = useState<SortKey>(statusFirst("PACKAGING_PENDING"));
  const [limit, setLimit] = useState(PAGE_STEP);
  const [total, setTotal] = useState(initialTotal);
  // Phone-only overlay; opens on tap, never from load()'s auto-select.
  const [detailOpen, setDetailOpen] = useState(false);
  // Which sort the rows on screen belong to; null until the first fetch lands.
  const [appliedSort, setAppliedSort] = useState<SortKey | null>(null);

  const search = useDebounced(query);

  // A new search or sort means a different result set, so the window resets
  // here rather than in an effect — that avoids a cascading render and a wasted
  // fetch at the old limit before the reset lands.
  function changeQuery(next: string) {
    setQuery(next);
    setLimit(PAGE_STEP);
  }

  function changeSort(next: SortKey) {
    setSort(next);
    setLimit(PAGE_STEP);
  }

  const load = useCallback(async () => {
    try {
      const page = await fetchOrders({ q: search, sort, limit });
      setOrders(page.orders);
      setTotal(page.total);
      setAppliedSort(sort);
      clearLoadError();
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [search, sort, limit, setLoadError, clearLoadError]);

  usePolling(load, 4000, initialOrders.length > 0);

  // A re-sort is in flight: the rows on screen are still the old ordering.
  const resorting = appliedSort !== null && appliedSort !== sort;

  const results = orders;
  const selected = orders.find((o) => o.order_id === selectedId) ?? null;

  const hasMore = orders.length < total;
  const sentinel = useInfiniteScroll(
    () => setLimit((n) => n + PAGE_STEP),
    hasMore,
  );

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      {error ? <ErrorBanner message={error} /> : null}

      <div className="grid items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:items-stretch">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-900">Search orders</h2>
            <SortSelect value={sort} options={SORT_OPTIONS} onChange={changeSort} busy={resorting} />
          </div>
          <div className="relative mt-4 shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Order id, customer, phone, or status"
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {loading ? (
            <Loader label="Loading orders…" />
          ) : results.length ? (
            <div className={`mt-5 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 transition-opacity ${resorting ? "opacity-50" : ""}`}>
              {results.map((order) => (
                <button
                  key={order.order_id}
                  onClick={() => {
                    setSelectedId(order.order_id);
                    setDetailOpen(true);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                    selectedId === order.order_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-slate-900">{order.order_id}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.customer_name} · {order.phone}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </button>
              ))}
              {hasMore ? (
                <div
                  ref={sentinel}
                  className="py-3 text-center text-xs font-medium text-slate-400"
                >
                  Loading more… ({results.length} of {total})
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState
              icon={<DocumentSearchIcon className="h-9 w-9" />}
              title="No order matched your search."
              subtitle="Try searching with a different keyword."
            />
          )}
        </section>

        <DetailPane
          open={detailOpen && !!selected}
          title="orders"
          onClose={() => setDetailOpen(false)}
          error={error}
        >
          {!selected ? (
            <EmptyState
              icon={<ClipboardIcon className="h-9 w-9" />}
              title="Select an order to view details."
              subtitle="Order information and timeline will appear here."
              full
            />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Order details
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{selected.order_id}</h3>
              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Customer" value={selected.customer_name} />
                <Row label="Phone" value={selected.phone} />
                <Row label="Status" value={statusLabel(selected.status)} />
                <Row
                  label="Token"
                  value={selected.token_number != null ? `#${selected.token_number}` : "—"}
                />
                <Row
                  label="Bagged"
                  value={`${baggedCount(selected)}/${selected.Order_Lines.length}`}
                />
              </dl>

              <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {selected.Order_Lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-3.5"
                  >
                    <p className="text-sm text-slate-700">{line.product_name}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {line.bag_number != null ? `Bag ${line.bag_number}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </DetailPane>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {statusLabel(status)}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}
