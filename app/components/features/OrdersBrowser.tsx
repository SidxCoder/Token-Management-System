"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";

// Read-only order search available to every role (search_orders permission).
export default function OrdersBrowser() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoading(false);
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

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? orders.filter((order) =>
          `${order.order_id} ${order.customer_name} ${order.phone} ${order.status}`
            .toLowerCase()
            .includes(search),
        )
      : orders;
  }, [orders, query]);

  const selected = orders.find((o) => o.order_id === selectedId) ?? null;

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
          <label className="block">
            <span className="text-sm font-semibold text-zinc-800">Search orders</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order id, customer, phone, or status"
              className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <div className="mt-5 space-y-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-zinc-500">Loading orders…</p>
            ) : results.length ? (
              results.map((order) => (
                <button
                  key={order.order_id}
                  onClick={() => setSelectedId(order.order_id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                    selectedId === order.order_id
                      ? "border-zinc-900 bg-zinc-50"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-zinc-900">{order.order_id}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {order.customer_name} · {order.phone}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </button>
              ))
            ) : (
              <p className="py-8 text-center text-sm text-zinc-500">
                No order matched your search.
              </p>
            )}
          </div>
        </section>

        <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {!selected ? (
            <div className="grid min-h-56 place-items-center text-center">
              <p className="text-sm text-zinc-500">Select an order to view details.</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Order details
              </p>
              <h3 className="mt-2 text-xl font-bold text-zinc-900">
                {selected.order_id}
              </h3>
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

              <div className="mt-5 divide-y divide-zinc-100 rounded-xl border border-zinc-200">
                {selected.Order_Lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-3.5"
                  >
                    <p className="text-sm text-zinc-800">{line.product_name}</p>
                    <span className="text-xs font-semibold text-zinc-500">
                      {line.bag_number != null ? `Bag ${line.bag_number}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-800">{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700">
      {statusLabel(status)}
    </span>
  );
}
