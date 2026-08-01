"use client";

import { useCallback, useRef, useState } from "react";
import {
  fetchOrders,
  orderAction,
  statusLabel,
  PAGE_STEP,
  type Order,
  type SortKey,
} from "@/app/components/shared/api";
import { useActionError } from "@/app/components/shared/useActionError";
import { useInfiniteScroll } from "@/app/components/shared/useInfiniteScroll";
import { usePolling } from "@/app/components/shared/usePolling";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import SortSelect from "@/app/components/dashboard/SortSelect";
import DetailPane from "@/app/components/dashboard/DetailPane";
import {
  ClipboardCheckIcon,
  ClipboardIcon,
  DeliveryIcon,
} from "@/app/components/dashboard/icons";

// This desk only ever shows READY_FOR_PICKUP, so a "status first" option would
// have nothing to reorder — token and name are the useful axes here.
const SORT_OPTIONS: SortKey[] = ["token", "token_desc", "name"];

// Cashier delivery desk: verify token and mark delivered (deliver permission).
export default function DeliveryDesk({
  initialOrders = [],
  initialTotal = 0,
}: {
  // Server-rendered first screenful. Without it the page paints, then the
  // browser makes a second cross-region round trip before anything shows.
  initialOrders?: Order[];
  initialTotal?: number;
} = {}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrders[0]?.order_id ?? null,
  );
  const [tokenInput, setTokenInput] = useState("");
  const [returnReason, setReturnReason] = useState("");
  const [confirmReturn, setConfirmReturn] = useState(false);
  const { error, setActionError, setLoadError, clearLoadError } = useActionError();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(initialOrders.length > 0);
  const [sort, setSort] = useState<SortKey>("token");
  const [limit, setLimit] = useState(PAGE_STEP);
  const [total, setTotal] = useState(initialTotal);
  // Phone-only overlay; opens on tap, never from load()'s auto-select.
  const [detailOpen, setDetailOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Order | null>(
    initialOrders[0] ?? null,
  );
  const autoSelected = useRef(initialOrders.length > 0);

  // A new sort means a different result set, so the window resets here rather
  // than in an effect — that avoids a cascading render and a wasted fetch at
  // the old limit before the reset lands.
  function changeSort(next: SortKey) {
    setSort(next);
    setLimit(PAGE_STEP);
  }

  const load = useCallback(async () => {
    try {
      const page = await fetchOrders({
        status: "READY_FOR_PICKUP",
        mine: true,
        sort,
        limit,
      });
      const data = page.orders;
      setOrders(data);
      setTotal(page.total);
      setSnapshot((prev) =>
        prev ? (data.find((o) => o.order_id === prev.order_id) ?? prev) : prev,
      );
      clearLoadError();
      // Only auto-select on the very first load. If the selected order later
      // leaves the queue (handed over, delivered, filtered out, or pushed past
      // the loaded window), clear the selection instead of silently jumping to
      // another order — otherwise the action buttons retarget under the user
      // and act on an order they never chose.
      setSelectedId((current) => {
        // Never retarget and never clear: once the user picks an order it stays
        // picked, even if it leaves this queue. Auto-select happens once.
        if (current) return current;
        if (autoSelected.current) return null;
        autoSelected.current = true;
        return data[0]?.order_id ?? null;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoaded(true);
    }
  }, [sort, limit, setLoadError, clearLoadError]);

  usePolling(load, 4000, initialOrders.length > 0);

  const hasMore = orders.length < total;
  const sentinel = useInfiniteScroll(
    () => setLimit((n) => n + PAGE_STEP),
    hasMore,
  );

  // An action can move the selected order out of this queue (handed over,
  // delivered, returned) and a re-sort can push it past the loaded window.
  // `snapshot` keeps the copy the user is working on so the screen never snaps
  // back to the list mid-task. It only ever changes on an explicit tap or when a
  // fresh copy of the SAME order arrives, so it can never retarget.
  const order = snapshot;
  const tokenOk =
    !order ||
    tokenInput.trim() === "" ||
    Number(tokenInput.trim()) === order.token_number;

  // The customer never turned up: send everything back to packing. This cancels
  // the token, so the order leaves the customer display immediately.
  async function returnOrder() {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      await orderAction(order.order_id, "return_order", { reason: returnReason.trim() });
      setReturnReason("");
      setConfirmReturn(false);
      setTokenInput("");
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Return failed");
    } finally {
      setBusy(false);
    }
  }

  async function markDelivered() {
    if (!order) return;
    if (Number(tokenInput.trim()) !== order.token_number) {
      setActionError("Enter the matching token number to deliver");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await orderAction(order.order_id, "deliver");
      setTokenInput("");
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Deliver failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <DeliveryIcon className="h-6 w-6" />
        </span>
        <div>
          <p className="text-sm text-slate-500">Ready for pickup</p>
          <p className="mt-0.5 text-2xl font-bold text-slate-900">{orders.length}</p>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:items-stretch">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Incoming orders</h2>
              <p className="mt-1 text-sm text-slate-500">Orders handed over by the runner.</p>
            </div>
            <SortSelect value={sort} options={SORT_OPTIONS} onChange={changeSort} />
          </div>
          {!loaded ? (
            <Loader label="Loading orders…" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardIcon className="h-9 w-9" />}
              title="No orders ready for pickup."
              subtitle="Orders will appear here once the runner hands them over."
            />
          ) : (
            <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {orders.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => {
                    setSelectedId(item.order_id);
                    setSnapshot(item);
                    setDetailOpen(true);
                    setTokenInput("");
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    item.order_id === selectedId
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">
                      Token #{item.token_number ?? "—"}
                    </p>
                    <span className="text-xs font-semibold text-slate-500">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {item.order_id} · {item.customer_name}
                  </p>
                </button>
              ))}
              {hasMore ? (
                <div
                  ref={sentinel}
                  className="py-3 text-center text-xs font-medium text-slate-400"
                >
                  Loading more… ({orders.length} of {total})
                </div>
              ) : null}
            </div>
          )}
        </section>

        <DetailPane
          open={detailOpen && !!order}
          title="orders"
          onClose={() => setDetailOpen(false)}
          error={error}
        >
          {!order ? (
            <EmptyState
              icon={<ClipboardCheckIcon className="h-9 w-9" />}
              title="Select an order to verify and deliver."
              subtitle="Choose an order from the list to view details and complete the delivery."
              full
            />
          ) : (
            <>
              <div className="border-b border-slate-100 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Order details
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  Token #{order.token_number ?? "—"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {order.order_id} · {order.customer_name} · {order.phone}
                </p>
              </div>

              <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {order.Order_Lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <p className="text-sm text-slate-700">{line.product_name}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {line.bag_number != null ? `Bag ${line.bag_number}` : "—"}
                    </span>
                  </div>
                ))}
              </div>

              <label className="mt-5 block max-w-xs text-sm font-semibold text-slate-700">
                Verify token number
                <input
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  placeholder={`Expected: ${order.token_number ?? ""}`}
                  className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </label>
              {tokenInput.trim() !== "" && !tokenOk && (
                <p className="mt-2 text-xs text-red-600">
                  Token does not match this order.
                </p>
              )}

              <button
                onClick={markDelivered}
                disabled={busy || !tokenOk || tokenInput.trim() === ""}
                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {busy ? "Updating…" : "Mark delivered"}
              </button>

              {confirmReturn ? (
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">
                    Return this order to packing?
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    The token is cancelled and removed from the customer display,
                    and every item goes back to the packing queue.
                  </p>
                  <input
                    value={returnReason}
                    onChange={(event) => setReturnReason(event.target.value)}
                    placeholder="Reason (optional) — e.g. customer left"
                    className="mt-3 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                  />
                  <div className="mt-3 flex gap-3">
                    <button
                      onClick={returnOrder}
                      disabled={busy}
                      className="flex-1 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
                    >
                      {busy ? "Returning…" : "Confirm return"}
                    </button>
                    <button
                      onClick={() => setConfirmReturn(false)}
                      disabled={busy}
                      className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-white disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmReturn(true)}
                  disabled={busy}
                  className="mt-3 w-full rounded-xl border border-amber-500 px-4 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Not collected — return to packing
                </button>
              )}
            </>
          )}
        </DetailPane>
      </div>
    </div>
  );
}
