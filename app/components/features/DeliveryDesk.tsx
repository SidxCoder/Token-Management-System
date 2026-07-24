"use client";

import { useCallback, useEffect, useState } from "react";
import {
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import {
  ClipboardCheckIcon,
  ClipboardIcon,
  DeliveryIcon,
} from "@/app/components/dashboard/icons";

// Cashier delivery desk: verify token and mark delivered (deliver permission).
export default function DeliveryDesk() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
    } finally {
      setLoaded(true);
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
      <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
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

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Incoming orders</h2>
          <p className="mt-1 text-sm text-slate-500">Orders handed over by the runner.</p>
          {!loaded ? (
            <Loader label="Loading orders…" />
          ) : orders.length === 0 ? (
            <EmptyState
              icon={<ClipboardIcon className="h-9 w-9" />}
              title="No orders ready for pickup."
              subtitle="Orders will appear here once the runner hands them over."
            />
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => {
                    setSelectedId(item.order_id);
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
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
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
            </>
          )}
        </section>
      </div>
    </div>
  );
}
