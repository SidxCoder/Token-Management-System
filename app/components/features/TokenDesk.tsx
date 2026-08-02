"use client";

import { useCallback, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  orderAction,
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
  ClipboardListIcon,
  DocumentSearchIcon,
  InfoIcon,
  SearchIcon,
} from "@/app/components/dashboard/icons";

const SEARCH_SORTS: SortKey[] = [...statusSorts(ALL_STATUSES), "name"];

// Every row here already has a token, so status matters less than token order.
const ISSUED_SORTS: SortKey[] = ["token_desc", "token", "name"];

// Token issuing desk (issue_token permission).
export default function TokenDesk({
  initialOrders = [],
  initialTotal = 0,
  initialIssued = [],
  initialIssuedTotal = 0,
}: {
  // Both tabs are server-rendered so neither costs a round trip after mount.
  initialOrders?: Order[];
  initialTotal?: number;
  initialIssued?: Order[];
  initialIssuedTotal?: number;
} = {}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrders[0]?.order_id ?? null,
  );
  const [view, setView] = useState<"search" | "issued">("search");
  const { error, setActionError, setLoadError, clearLoadError } = useActionError();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(initialOrders.length > 0);
  const [issued, setIssued] = useState<Order[]>(initialIssued);
  const [sort, setSort] = useState<SortKey>(statusFirst("PACKAGED"));
  const [issuedSort, setIssuedSort] = useState<SortKey>("token_desc");
  // The two tabs scroll independently, so each keeps its own window.
  const [limit, setLimit] = useState(PAGE_STEP);
  const [issuedLimit, setIssuedLimit] = useState(PAGE_STEP);
  const [total, setTotal] = useState(initialTotal);
  const [issuedTotal, setIssuedTotal] = useState(initialIssuedTotal);
  // Which sort each tab's rows belong to; null until that tab's first fetch.
  const [appliedSort, setAppliedSort] = useState<SortKey | null>(null);
  const [appliedIssuedSort, setAppliedIssuedSort] = useState<SortKey | null>(null);
  // Phone-only: the detail overlay opens on tap, never from the auto-select
  // that load() performs, or it would reopen itself after every poll.
  const [detailOpen, setDetailOpen] = useState(false);

  const search = useDebounced(query);

  // Each tab resets its own window at the event rather than in an effect — that
  // avoids a cascading render and a wasted fetch at the old limit.
  function changeQuery(next: string) {
    setQuery(next);
    setLimit(PAGE_STEP);
  }

  function changeSort(next: SortKey) {
    setSort(next);
    setLimit(PAGE_STEP);
  }

  function changeIssuedSort(next: SortKey) {
    setIssuedSort(next);
    setIssuedLimit(PAGE_STEP);
  }

  // Two requests: the search tab browses every order, the issued tab needs only
  // orders that already carry a token. Both filters are server-side so neither
  // list is limited to whatever happened to land on the first page.
  const load = useCallback(async () => {
    try {
      const [all, withToken] = await Promise.all([
        fetchOrders({ q: search, sort, limit }),
        fetchOrders({ hasToken: true, sort: issuedSort, limit: issuedLimit }),
      ]);
      setOrders(all.orders);
      setTotal(all.total);
      clearLoadError();
      setIssued(withToken.orders);
      setIssuedTotal(withToken.total);
      setAppliedSort(sort);
      setAppliedIssuedSort(issuedSort);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoaded(true);
    }
  }, [search, sort, issuedSort, limit, issuedLimit, setLoadError, clearLoadError]);

  usePolling(load, 4000, initialOrders.length > 0);

  // A re-sort is in flight: the rows on screen are still the old ordering.
  const resorting = appliedSort !== null && appliedSort !== sort;
  const issuedResorting =
    appliedIssuedSort !== null && appliedIssuedSort !== issuedSort;

  const results = orders;

  const hasMore = orders.length < total;
  const sentinel = useInfiniteScroll(
    () => setLimit((n) => n + PAGE_STEP),
    hasMore,
  );

  const hasMoreIssued = issued.length < issuedTotal;
  const issuedSentinel = useInfiniteScroll(
    () => setIssuedLimit((n) => n + PAGE_STEP),
    hasMoreIssued,
  );

  const selected = orders.find((o) => o.order_id === selectedId) ?? null;
  const canIssue =
    selected?.status === "PACKAGING_PENDING" || selected?.status === "PACKAGED";

  async function issueToken() {
    if (!selected || !canIssue) return;
    setBusy(true);
    setActionError(null);
    try {
      await orderAction(selected.order_id, "issue_token");
      await load();
      setView("issued");
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to issue token");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      {loaded && orders.length === 0 ? (
        <section className="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <InfoIcon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">No orders yet</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Tokens can only be issued after orders exist. A packager or admin must
              import the Excel sheet first.
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex shrink-0 gap-2 border-b border-slate-200">
        <TabButton active={view === "search"} onClick={() => setView("search")}>
          Search order
        </TabButton>
        <TabButton active={view === "issued"} onClick={() => setView("issued")}>
          Issued tokens
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
            {issued.length}
          </span>
        </TabButton>
      </div>

      {view === "search" ? (
        <div className="grid items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:items-stretch">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:min-h-0 lg:flex-col">
            <div className="flex shrink-0 items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">Search order</h2>
              <SortSelect value={sort} options={SEARCH_SORTS} onChange={changeSort} busy={resorting} />
            </div>
            <div className="relative mt-4 shrink-0">
              <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                value={query}
                onChange={(event) => changeQuery(event.target.value)}
                placeholder="Order number, name, or phone"
                className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {!loaded ? (
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
                subtitle="Try searching with a different order number, name, or phone."
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
                icon={<ClipboardListIcon className="h-9 w-9" />}
                title="Select an order"
                subtitle="Choose a result to issue a token and view order details here."
                full
              />
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Order details
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{selected.order_id}</h3>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row label="Customer" value={selected.customer_name} />
                  <Row label="Phone" value={selected.phone} />
                  <Row label="Status" value={statusLabel(selected.status)} />
                  <Row
                    label="Bagged"
                    value={`${baggedCount(selected)}/${selected.Order_Lines.length}`}
                  />
                  <Row
                    label="Token"
                    value={selected.token_number != null ? `#${selected.token_number}` : "—"}
                  />
                </dl>

                {/* The greeter hands the customer their token, so they need to
                    see what the order actually contains — not just a count. */}
                <div className="mt-6">
                  <h4 className="text-sm font-semibold text-slate-900">
                    Items ({selected.Order_Lines.length})
                  </h4>
                  <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {selected.Order_Lines.map((line) => (
                      <div
                        key={line.id}
                        className="flex items-center justify-between gap-3 p-3.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm text-slate-700">
                            {line.product_name}
                          </p>
                          {line.sku_code ? (
                            <p className="mt-0.5 truncate font-mono text-xs text-slate-400">
                              {line.sku_code}
                            </p>
                          ) : null}
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-slate-500">
                          {line.bag_number != null ? `Bag ${line.bag_number}` : "No bag"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  onClick={issueToken}
                  disabled={!canIssue || busy}
                  className="mt-7 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  {busy
                    ? "Issuing…"
                    : canIssue
                      ? "Issue token"
                      : selected.token_number != null
                        ? "Token already issued"
                        : "Cannot issue yet"}
                </button>
              </>
            )}
          </DetailPane>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-5 py-5">
            <div>
              <h2 className="font-semibold text-slate-900">Issued tokens</h2>
              <p className="mt-1 text-sm text-slate-500">
                Orders that currently have a token number.
              </p>
            </div>
            <SortSelect
              value={issuedSort}
              options={ISSUED_SORTS}
              onChange={changeIssuedSort}
              busy={issuedResorting}
            />
          </div>
          {issued.length ? (
            <div className="divide-y divide-slate-100 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {issued.map((order) => (
                <div
                  key={order.order_id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      Token #{String(order.token_number).padStart(3, "0")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.order_id} · {order.customer_name}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
              {hasMoreIssued ? (
                <div
                  ref={issuedSentinel}
                  className="py-3 text-center text-xs font-medium text-slate-400"
                >
                  Loading more… ({issued.length} of {issuedTotal})
                </div>
              ) : null}
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
              No tokens issued yet.
            </p>
          )}
        </section>
      )}
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

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${
        active
          ? "border-blue-600 text-blue-700"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
