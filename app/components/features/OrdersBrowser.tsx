"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";
import EmptyState from "@/app/components/dashboard/EmptyState";
import {
  ClipboardIcon,
  DocumentSearchIcon,
  SearchIcon,
} from "@/app/components/dashboard/icons";

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
      {error ? <ErrorBanner message={error} /> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Search orders</h2>
          <div className="relative mt-4">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Order id, customer, phone, or status"
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {loading ? (
            <EmptyState
              icon={<DocumentSearchIcon className="h-9 w-9" />}
              title="Loading orders…"
            />
          ) : results.length ? (
            <div className="mt-5 space-y-3">
              {results.map((order) => (
                <button
                  key={order.order_id}
                  onClick={() => setSelectedId(order.order_id)}
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
            </div>
          ) : (
            <EmptyState
              icon={<DocumentSearchIcon className="h-9 w-9" />}
              title="No order matched your search."
              subtitle="Try searching with a different keyword."
            />
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!selected ? (
            <EmptyState
              icon={<ClipboardIcon className="h-9 w-9" />}
              title="Select an order to view details."
              subtitle="Order information and timeline will appear here."
              full
            />
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Order details
              </p>
              <h3 className="mt-2 text-xl font-bold text-slate-900">{selected.order_id}</h3>
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

              <div className="mt-5 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {selected.Order_Lines.map((line) => (
                  <div
                    key={line.id}
                    className="flex items-center justify-between gap-3 p-3.5"
                  >
                    <p className="text-sm text-slate-700">{line.product_name}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {line.bag_number != null ? `Bag ${line.bag_number}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
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

function StatusBadge({ status }: { status: Order["status"] }) {
  return (
    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      {statusLabel(status)}
    </span>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}
