"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";

export default function RunnerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchOrders();
      const relevant = data.filter((o) =>
        ["TOKEN_ISSUED", "HANDOVER"].includes(o.status),
      );
      setOrders(relevant);
      setSelectedId((current) =>
        current && relevant.some((o) => o.order_id === current)
          ? current
          : (relevant[0]?.order_id ?? null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void load();
    }, 0);
    const id = window.setInterval(() => {
      void load();
    }, 4000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [load]);

  const order = orders.find((o) => o.order_id === selectedId) ?? null;

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
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <Count label="Ready to collect" value={summary.collect} />
        <Count label="Awaiting cashier" value={summary.handover} />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.4fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Assigned tokens</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Collect from packager, then hand to cashier.
          </p>
          <div className="mt-4 space-y-3">
            {orders.map((item) => (
              <button
                key={item.order_id}
                onClick={() => setSelectedId(item.order_id)}
                className={`w-full rounded-xl border p-4 text-left ${
                  item.order_id === selectedId
                    ? "border-amber-500 bg-amber-50"
                    : "border-zinc-200 hover:border-amber-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    Token #{item.token_number ?? "—"}
                  </p>
                  <span className="text-xs font-semibold text-zinc-500">
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">
                  {item.order_id} · {item.customer_name}
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  {baggedCount(item)}/{item.Order_Lines.length} bagged
                </p>
              </button>
            ))}
            {orders.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                No tokens waiting for runner.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          {!order ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              Select a token to continue.
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-zinc-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                    Bag details
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    Token #{order.token_number ?? "—"}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {order.order_id} · {order.customer_name}
                  </p>
                </div>
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="mt-6 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                {order.Order_Lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <p className="text-sm text-zinc-800">{line.product_name}</p>
                    <span className="text-xs font-semibold text-zinc-500">
                      {line.bag_number != null
                        ? `Bag ${line.bag_number}`
                        : "No bag"}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={collectBag}
                  disabled={order.status !== "TOKEN_ISSUED" || busy}
                  className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  Collect bag
                </button>
                <button
                  onClick={handToCashier}
                  disabled={order.status !== "HANDOVER" || busy}
                  className="flex-1 rounded-xl border border-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400"
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

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
