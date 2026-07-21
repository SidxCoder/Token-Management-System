"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";

// Bag assignment + handover to runner (set_bag_number permission).
export default function PackingQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bagDrafts, setBagDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchOrders();
      const relevant = data.filter((o) =>
        ["PACKAGING_PENDING", "PACKAGED", "TOKEN_ISSUED"].includes(o.status),
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
    const initial = window.setTimeout(() => void load(), 0);
    const id = window.setInterval(() => void load(), 4000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(id);
    };
  }, [load]);

  const order = orders.find((o) => o.order_id === selectedId) ?? null;

  const summary = useMemo(
    () => ({
      pending: orders.filter((o) => o.status === "PACKAGING_PENDING").length,
      packaged: orders.filter((o) => o.status === "PACKAGED").length,
      tokenIssued: orders.filter((o) => o.status === "TOKEN_ISSUED").length,
    }),
    [orders],
  );

  async function assignBag(lineId: string) {
    if (!order) return;
    const raw = bagDrafts[lineId]?.trim();
    const bagNumber = Number(raw);
    if (!raw || !Number.isInteger(bagNumber) || bagNumber < 1) {
      setError("Enter a positive bag number");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await orderAction(order.order_id, "set_bag_number", { lineId, bagNumber });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to set bag number");
    } finally {
      setBusy(false);
    }
  }

  async function handToRunner() {
    if (!order) return;
    setBusy(true);
    setError(null);
    try {
      await orderAction(order.order_id, "hand_to_runner");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to hand over");
    } finally {
      setBusy(false);
    }
  }

  const allBagged = order
    ? order.Order_Lines.every((l) => l.bag_number != null)
    : false;
  const canHandOver = order?.status === "TOKEN_ISSUED" && allBagged;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        <Count label="Pending" value={summary.pending} />
        <Count label="Packaged" value={summary.packaged} />
        <Count label="Token issued" value={summary.tokenIssued} />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.4fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Bag queue</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Assign bag numbers, then hand over after token is issued.
          </p>
          <div className="mt-4 space-y-3">
            {orders.map((item) => (
              <button
                key={item.order_id}
                onClick={() => setSelectedId(item.order_id)}
                className={`w-full rounded-xl border p-4 text-left ${
                  item.order_id === selectedId
                    ? "border-blue-500 bg-blue-50"
                    : "border-zinc-200 hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{item.order_id}</p>
                  <span className="text-xs font-semibold text-zinc-500">
                    {statusLabel(item.status)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{item.customer_name}</p>
                <p className="mt-2 text-xs text-zinc-500">
                  {baggedCount(item)}/{item.Order_Lines.length} bagged
                </p>
              </button>
            ))}
            {orders.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                No packing orders. Import an Excel file to begin.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          {!order ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              Select an order from the queue.
            </p>
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-zinc-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                    Order details
                  </p>
                  <h2 className="mt-1 text-xl font-bold">{order.order_id}</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    {order.customer_name}
                    {order.token_number != null ? ` · Token #${order.token_number}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold">Line bag numbers</h3>
                <div className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                  {order.Order_Lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <p className="flex-1 text-sm text-zinc-800">{line.product_name}</p>
                      {line.bag_number != null ? (
                        <span className="text-sm font-semibold text-emerald-700">
                          Bag {line.bag_number}
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            value={bagDrafts[line.id] ?? ""}
                            onChange={(event) =>
                              setBagDrafts((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            placeholder="Bag #"
                            className="w-24 rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => assignBag(line.id)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Assign
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handToRunner}
                disabled={!canHandOver || busy}
                className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                Hand over to runner
              </button>
              {!canHandOver && (
                <p className="mt-3 text-center text-xs text-zinc-500">
                  Needs token issued and every line bagged.
                </p>
              )}
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
