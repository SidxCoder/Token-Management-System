"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  orderAction,
  statusLabel,
  statusFirst,
  statusSorts,
  fetchStaff,
  staffLabel,
  PAGE_STEP,
  type Order,
  type Staff,
  type SortKey,
} from "@/app/components/shared/api";
import { RUNNER_STATUSES } from "@/app/components/shared/queries";
import { useActionError } from "@/app/components/shared/useActionError";
import { useInfiniteScroll } from "@/app/components/shared/useInfiniteScroll";
import { usePolling } from "@/app/components/shared/usePolling";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import SortSelect from "@/app/components/dashboard/SortSelect";
import DetailPane from "@/app/components/dashboard/DetailPane";
import {
  BagIcon,
  ClipboardListIcon,
  RunnerIcon,
  TicketIcon,
} from "@/app/components/dashboard/icons";

const SORT_OPTIONS: SortKey[] = [
  ...statusSorts(RUNNER_STATUSES),
  "token",
  "token_desc",
  "name",
];

// Runner handovers: collect from packager, hand to cashier (hand_to_cashier).
export default function RunnerQueue({
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
  const { error, setActionError, setLoadError, clearLoadError } = useActionError();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(initialOrders.length > 0);
  const [sort, setSort] = useState<SortKey>(statusFirst("TOKEN_ISSUED"));
  const [limit, setLimit] = useState(PAGE_STEP);
  const [total, setTotal] = useState(initialTotal);
  // Phone-only overlay; opens on tap, never from load()'s auto-select.
  const [detailOpen, setDetailOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<Order | null>(
    initialOrders[0] ?? null,
  );
  const autoSelected = useRef(initialOrders.length > 0);
  // Which sort the rows on screen actually belong to. Null until the first
  // fetch lands, so the initial render is not reported as "re-sorting".
  const [appliedSort, setAppliedSort] = useState<SortKey | null>(null);
  const [cashiers, setCashiers] = useState<Staff[]>([]);
  const [cashierId, setCashierId] = useState("");

  // Cashier list changes rarely, so it is fetched once rather than on the poll.
  useEffect(() => {
    void fetchStaff("CASHIER").then(setCashiers);
  }, []);

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
        status: RUNNER_STATUSES,
        sort,
        limit,
        mine: true,
        lines: ["RELEASED", "WITH_RUNNER"],
      });
      const relevant = page.orders;
      setOrders(relevant);
      setTotal(page.total);
      setAppliedSort(sort);
      setSnapshot((prev) =>
        prev ? (relevant.find((o) => o.order_id === prev.order_id) ?? prev) : prev,
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
        return relevant[0]?.order_id ?? null;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoaded(true);
    }
  }, [sort, limit, setLoadError, clearLoadError]);

  usePolling(load, 4000, initialOrders.length > 0);

  // An action can move the selected order out of this queue (handed over,
  // delivered, returned) and a re-sort can push it past the loaded window.
  // `snapshot` keeps the copy the user is working on so the screen never snaps
  // back to the list mid-task. It only ever changes on an explicit tap or when a
  // fresh copy of the SAME order arrives, so it can never retarget.
  // A re-sort is in flight: the rows on screen are still the old ordering.
  const resorting = appliedSort !== null && appliedSort !== sort;

  const order = snapshot;
  // The pane deliberately keeps showing an order after it leaves this queue, so
  // the screen does not snap back to the list mid-task. But it is then a record
  // of something already done — its actions must not stay live, or a second
  // click fires an action the order's new status no longer allows.
  const moved = order != null && !orders.some((o) => o.order_id === order.order_id);

  const hasMore = orders.length < total;
  const sentinel = useInfiniteScroll(
    () => setLimit((n) => n + PAGE_STEP),
    hasMore,
  );

  const summary = useMemo(
    () => ({
      collect: orders.filter((o) => o.status === "TOKEN_ISSUED").length,
      handover: orders.filter((o) => o.status === "HANDOVER").length,
    }),
    [orders],
  );

  async function collectBag() {
    if (!order) return;
    setBusy(true);
    setActionError(null);
    try {
      // No runnerId needed: the packager already routed this order, and the
      // server keeps that assignment. Sending none used to error with
      // "pick which runner to hand over to" for anyone who is not a runner.
      setSnapshot(await orderAction(order.order_id, "hand_to_runner"));
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Collect failed");
    } finally {
      setBusy(false);
    }
  }

  async function handToCashier() {
    if (!order) return;
    if (!cashierId) {
      setActionError("Pick which cashier counter is taking this bag");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      // The order leaves this queue on success, so the refetch cannot refresh
      // it — take the updated copy from the response instead. Without this the
      // pane kept the HANDOVER status and a second click hit the server with
      // "cannot hand to cashier while order is READY_FOR_PICKUP".
      setSnapshot(await orderAction(order.order_id, "hand_to_cashier", { cashierId }));
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Handover failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
      <div className="grid shrink-0 gap-4 sm:grid-cols-2">
        <Stat icon={<BagIcon className="h-6 w-6" />} label="Ready to collect" value={summary.collect} />
        <Stat icon={<RunnerIcon className="h-6 w-6" />} label="Awaiting cashier" value={summary.handover} />
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
              <h2 className="text-base font-semibold text-slate-900">Assigned tokens</h2>
              <p className="mt-1 text-sm text-slate-500">
                Collect from packager, then hand to cashier.
              </p>
            </div>
            <SortSelect value={sort} options={SORT_OPTIONS} onChange={changeSort} busy={resorting} />
          </div>
          {!loaded ? (
            <Loader label="Loading tokens…" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardListIcon className="h-9 w-9" />}
              title="No tokens waiting for runner."
              subtitle="Once tokens are assigned, they will appear here."
            />
          ) : (
            <div className={`mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1 transition-opacity ${resorting ? "opacity-50" : ""}`}>
              {orders.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => {
                    setSelectedId(item.order_id);
                    setSnapshot(item);
                    setDetailOpen(true);
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
                  <p className="mt-2 text-xs text-slate-400">
                    {baggedCount(item)}/{item.Order_Lines.length} bagged{item.Order_Lines.some((l) => l.stage !== "PACKING") &&
                    item.Order_Lines.some((l) => l.stage === "PACKING")
                      ? " · partially handed over"
                      : ""}
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
          title="tokens"
          onClose={() => setDetailOpen(false)}
          error={error}
        >
          {!order ? (
            <EmptyState
              icon={<TicketIcon className="h-9 w-9" />}
              title="Select a token to continue."
              subtitle="View token details and update status."
              full
            />
          ) : (
            <>
              {moved ? (
                <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-sm text-slate-600">
                    This order is now{" "}
                    <span className="font-semibold text-slate-800">
                      {statusLabel(order.status)}
                    </span>{" "}
                    and has left the runner queue. Shown for reference only.
                  </p>
                  <button
                    onClick={() => {
                      setSnapshot(null);
                      setSelectedId(null);
                      setDetailOpen(false);
                    }}
                    className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-800"
                  >
                    Done
                  </button>
                </div>
              ) : null}
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Bag details
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    Token #{order.token_number ?? "—"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {order.order_id} · {order.customer_name}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="mt-6 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {order.Order_Lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <p className="text-sm text-slate-700">{line.product_name}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {line.bag_number != null ? `Bag ${line.bag_number}` : "No bag"}
                    </span>
                  </div>
                ))}
              </div>

              <label className="mt-6 block text-sm font-medium text-slate-700">
                Cashier counter
                <select
                  value={cashierId}
                  onChange={(event) => setCashierId(event.target.value)}
                  disabled={moved || order.status !== "HANDOVER" || busy}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Select a cashier…</option>
                  {cashiers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {staffLabel("Cashier", c)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={collectBag}
                  disabled={moved || order.status !== "TOKEN_ISSUED" || busy}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Collect bag
                </button>
                <button
                  onClick={handToCashier}
                  disabled={moved || order.status !== "HANDOVER" || busy || !cashierId}
                  className="flex-1 rounded-xl border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Hand over to cashier
                </button>
              </div>
              {order.status === "HANDOVER" && cashiers.length === 0 ? (
                <p className="mt-3 text-center text-xs text-slate-400">
                  No active cashiers. Add one under Users.
                </p>
              ) : null}
            </>
          )}
        </DetailPane>
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
