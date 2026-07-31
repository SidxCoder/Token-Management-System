"use client";

import { useCallback, useState } from "react";
import {
  fetchOrders,
  orderAction,
  statusLabel,
  statusSorts,
  UNDELIVERED_STATUSES,
  PAGE_STEP,
  type Order,
  type SortKey,
} from "@/app/components/shared/api";
import { useDebounced } from "@/app/components/shared/useDebounced";
import { useActionError } from "@/app/components/shared/useActionError";
import { useInfiniteScroll } from "@/app/components/shared/useInfiniteScroll";
import { usePolling } from "@/app/components/shared/usePolling";
import Loader from "@/app/components/dashboard/Loader";
import SortSelect from "@/app/components/dashboard/SortSelect";
import DetailPane from "@/app/components/dashboard/DetailPane";

const SORT_OPTIONS: SortKey[] = [
  "token",
  "token_desc",
  ...statusSorts(UNDELIVERED_STATUSES),
  "name",
];

// Admin-only token cancellation (cancel_token permission). Cancelling an active
// token clears the order's token number and returns it to the packing stage.
export default function CancelToken() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { error, setActionError, setLoadError, clearLoadError } = useActionError();
  const [message, setMessage] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("token");
  const [limit, setLimit] = useState(PAGE_STEP);
  const [total, setTotal] = useState(0);
  // Phone-only overlay; opens on tap, never from load()'s auto-select.
  const [detailOpen, setDetailOpen] = useState(false);

  const term = useDebounced(search);

  // A new search or sort means a different result set, so the window resets
  // here rather than in an effect — that avoids a cascading render and a wasted
  // fetch at the old limit before the reset lands.
  function changeSearch(next: string) {
    setSearch(next);
    setLimit(PAGE_STEP);
  }

  function changeSort(next: SortKey) {
    setSort(next);
    setLimit(PAGE_STEP);
  }

  const load = useCallback(async () => {
    try {
      const page = await fetchOrders({
        q: term,
        status: UNDELIVERED_STATUSES,
        hasToken: true,
        sort,
        limit,
      });
      const data = page.orders;
      setOrders(data);
      setTotal(page.total);
      clearLoadError();
      setSelectedId((current) =>
        current && data.some((o) => o.order_id === current)
          ? current
          : (data[0]?.order_id ?? null),
      );
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoaded(true);
    }
  }, [term, sort, limit, setLoadError, clearLoadError]);

  usePolling(load, 4000);

  const filtered = orders;
  const selected = orders.find((o) => o.order_id === selectedId) ?? null;

  const hasMore = orders.length < total;
  const sentinel = useInfiniteScroll(
    () => setLimit((n) => n + PAGE_STEP),
    hasMore,
  );

  async function cancelToken() {
    if (!selected) return;
    setBusy(true);
    setActionError(null);
    setMessage(null);
    try {
      await orderAction(selected.order_id, "cancel_token");
      setMessage(`Token cancelled for ${selected.order_id}.`);
      setConfirming(false);
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to cancel token");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:items-stretch">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Active tokens</h2>
              <p className="mt-1 text-sm text-slate-500">
                Orders with an issued token that has not been delivered.
              </p>
            </div>
            <SortSelect value={sort} options={SORT_OPTIONS} onChange={changeSort} />
          </div>
          <label className="mt-4 block shrink-0">
            <span className="sr-only">Search orders</span>
            <input
              value={search}
              onChange={(event) => changeSearch(event.target.value)}
              placeholder="Order id, customer, phone, or token"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
          </label>
          {!loaded ? (
            <Loader label="Loading tokens…" />
          ) : (
            <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {filtered.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => {
                    setSelectedId(item.order_id);
                    setDetailOpen(true);
                    setConfirming(false);
                    setMessage(null);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    item.order_id === selectedId
                      ? "border-rose-500 bg-rose-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">Token #{item.token_number}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.order_id} · {item.customer_name}
                  </p>
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="py-8 text-center text-sm text-slate-500">
                  No active tokens to cancel.
                </p>
              )}
              {hasMore ? (
                <div
                  ref={sentinel}
                  className="py-3 text-center text-xs font-medium text-slate-400"
                >
                  Loading more… ({filtered.length} of {total})
                </div>
              ) : null}
            </div>
          )}
        </section>

        <DetailPane
          open={detailOpen}
          title="tokens"
          onClose={() => setDetailOpen(false)}
        >
          {!selected ? (
            <p className="py-16 text-center text-sm text-slate-500">
              Select an order to cancel its token.
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-600">
                Selected order
              </p>
              <h3 className="mt-1 text-xl font-bold text-slate-900">
                Token #{selected.token_number}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {selected.order_id} · {selected.customer_name} · {selected.phone}
              </p>

              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Current status" value={statusLabel(selected.status)} />
                <Row label="Items" value={String(selected.number_of_items)} />
              </dl>

              <div className="mt-6 rounded-xl border border-rose-100 bg-rose-50 p-4">
                <p className="text-sm font-semibold text-rose-700">Cancelling a token</p>
                <p className="mt-1 text-xs text-rose-600">
                  This voids the active token, clears the order&apos;s token number, and
                  returns the order to the packing stage. A new token can be issued
                  afterwards.
                </p>
              </div>

              {confirming ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    onClick={cancelToken}
                    disabled={busy}
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Cancelling…" : `Confirm cancel Token #${selected.token_number}`}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Keep token
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setConfirming(true);
                    setMessage(null);
                  }}
                  className="mt-5 w-full rounded-xl border border-rose-300 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-50"
                >
                  Cancel token
                </button>
              )}
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
