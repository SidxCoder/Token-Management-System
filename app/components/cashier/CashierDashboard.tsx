"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";

export default function CashierDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchOrders({ status: "READY_FOR_PICKUP" });
      setOrders(data);
      setSelectedId((current) =>
        current && data.some((o) => o.order_id === current)
          ? current
          : (data[0]?.order_id ?? null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [load]);

  const order = orders.find((o) => o.order_id === selectedId) ?? null;
  const tokenOk =
    !order ||
    tokenInput.trim() === "" ||
    Number(tokenInput.trim()) === order.token_number;

  async function markDelivered() {
    if (!order) return;
    if (Number(tokenInput.trim()) !== order.token_number) {
      setError("Enter the matching token number to deliver");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await orderAction(order.order_id, "deliver");
      setTokenInput("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deliver failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <p className="text-sm text-zinc-500">Ready for pickup</p>
        <p className="mt-1 text-2xl font-bold text-violet-700">{orders.length}</p>
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.4fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold">Incoming orders</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Orders handed over by the runner.
          </p>
          <div className="mt-4 space-y-3">
            {orders.map((item) => (
              <button
                key={item.order_id}
                onClick={() => {
                  setSelectedId(item.order_id);
                  setTokenInput("");
                }}
                className={`w-full rounded-xl border p-4 text-left ${
                  item.order_id === selectedId
                    ? "border-violet-500 bg-violet-50"
                    : "border-zinc-200 hover:border-violet-300"
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
              </button>
            ))}
            {orders.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                No orders ready for pickup.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          {!order ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              Select an order to verify and deliver.
            </p>
          ) : (
            <>
              <div className="border-b border-zinc-100 pb-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-700">
                  Order details
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  Token #{order.token_number ?? "—"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {order.order_id} · {order.customer_name} · {order.phone}
                </p>
              </div>

              <div className="mt-5 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                {order.Order_Lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-4"
                  >
                    <p className="text-sm text-zinc-800">{line.product_name}</p>
                    <span className="text-xs font-semibold text-zinc-500">
                      {line.bag_number != null
                        ? `Bag ${line.bag_number}`
                        : "—"}
                    </span>
                  </div>
                ))}
              </div>

              <label className="mt-5 block max-w-xs text-sm font-semibold text-zinc-800">
                Verify token number
                <input
                  value={tokenInput}
                  onChange={(event) => setTokenInput(event.target.value)}
                  placeholder={`Expected: ${order.token_number ?? ""}`}
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2.5 font-normal outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
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
                className="mt-6 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                {busy ? "Updating…" : "Mark delivered"}
              </button>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
