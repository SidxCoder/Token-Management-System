"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  orderAction,
  statusLabel,
  statusFirst,
  statusSorts,
  PAGE_STEP,
  type Order,
  type OrderStatus,
  type SortKey,
} from "@/app/components/shared/api";
import { useInfiniteScroll } from "@/app/components/shared/useInfiniteScroll";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import SortSelect from "@/app/components/dashboard/SortSelect";
import {
  BagIcon,
  ClipboardListIcon,
  RunnerIcon,
  TicketIcon,
} from "@/app/components/dashboard/icons";

const RUNNER_STATUSES: OrderStatus[] = ["TOKEN_ISSUED", "HANDOVER"];

const SORT_OPTIONS: SortKey[] = [
  ...statusSorts(RUNNER_STATUSES),
  "token",
  "token_desc",
  "name",
];

// Runner handovers: collect from packager, hand to cashier (hand_to_cashier).
export default function RunnerQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [sort, setSort] = useState<SortKey>(statusFirst("TOKEN_ISSUED"));
  const [limit, setLimit] = useState(PAGE_STEP);
  const [total, setTotal] = useState(0);

  // A new sort means a different result set, so the window resets here rather
  // than in an effect — that avoids a cascading render and a wasted fetch at
  // the old limit before the reset lands.
  function changeSort(next: SortKey) {
    setSort(next);
    setLimit(PAGE_STEP);
  }

  const load = useCallback(async () => {
    setError(null);
    try {
      const page = await fetchOrders({ status: RUNNER_STATUSES, sort, limit });
      const relevant = page.orders;
      setOrders(relevant);
      setTotal(page.total);
      setSelectedId((current) =>
        current && relevant.some((o) => o.order_id === current)
          ? current
          : (relevant[0]?.order_id ?? null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoaded(true);
    }
  }, [sort, limit]);

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), 4000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [load]);

  const order = orders.find((o) => o.order_id === selectedId) ?? null;

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
    setError(null);
    try {
      await orderAction(order.order_id, "hand_to_runner");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Collect failed");
    } finally {
      setBusy(false);
    }
  }

  async function handToCashier() {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      await orderAction(order.order_id, "hand_to_cashier");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Handover failed");
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
            <SortSelect value={sort} options={SORT_OPTIONS} onChange={changeSort} />
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
            <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {orders.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => setSelectedId(item.order_id)}
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
                    {baggedCount(item)}/{item.Order_Lines.length} bagged
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

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:max-h-full lg:self-start lg:overflow-y-auto">
          {!order ? (
            <EmptyState
              icon={<TicketIcon className="h-9 w-9" />}
              title="Select a token to continue."
              subtitle="View token details and update status."
              full
            />
          ) : (
            <>
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

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={collectBag}
                  disabled={order.status !== "TOKEN_ISSUED" || busy}
                  className="flex-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                >
                  Collect bag
                </button>
                <button
                  onClick={handToCashier}
                  disabled={order.status !== "HANDOVER" || busy}
                  className="flex-1 rounded-xl border border-blue-600 px-4 py-3 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                >
                  Hand over to cashier
                </button>
              </div>
            </>
          )}
        </section>
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
