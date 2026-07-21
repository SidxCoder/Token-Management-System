"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";

// Admin-only token cancellation (cancel_token permission). Cancelling an active
// token clears the order's token number and returns it to the packing stage.
export default function CancelToken() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchOrders();
      // Only orders that currently hold an active token can be cancelled.
      const relevant = data.filter(
        (o) => o.token_number != null && o.status !== "DELIVERED",
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

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? orders.filter((order) =>
          `${order.order_id} ${order.customer_name} ${order.phone} ${order.token_number}`
            .toLowerCase()
            .includes(term),
        )
      : orders;
  }, [orders, search]);

  const selected = orders.find((o) => o.order_id === selectedId) ?? null;

  async function cancelToken() {
    if (!selected) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await orderAction(selected.order_id, "cancel_token");
      setMessage(`Token cancelled for ${selected.order_id}.`);
      setConfirming(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to cancel token");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-zinc-900">Active tokens</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Orders with an issued token that has not been delivered.
          </p>
          <label className="mt-4 block">
            <span className="sr-only">Search orders</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order id, customer, phone, or token"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
            />
          </label>
          <div className="mt-4 space-y-3">
            {filtered.map((item) => (
              <button
                key={item.order_id}
                onClick={() => {
                  setSelectedId(item.order_id);
                  setConfirming(false);
                  setMessage(null);
                }}
                className={`w-full rounded-xl border p-4 text-left ${
                  item.order_id === selectedId
                    ? "border-rose-500 bg-rose-50"
                    : "border-zinc-200 hover:border-rose-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-zinc-900">
                    Token #{item.token_number}
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
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-zinc-500">
                No active tokens to cancel.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {!selected ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              Select an order to cancel its token.
            </p>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
                Selected order
              </p>
              <h3 className="mt-1 text-xl font-bold text-zinc-900">
                Token #{selected.token_number}
              </h3>
              <p className="mt-1 text-sm text-zinc-500">
                {selected.order_id} · {selected.customer_name} · {selected.phone}
              </p>

              <dl className="mt-6 space-y-3 text-sm">
                <Row label="Current status" value={statusLabel(selected.status)} />
                <Row label="Items" value={String(selected.number_of_items)} />
              </dl>

              <div className="mt-6 rounded-xl border border-rose-100 bg-rose-50/60 p-4">
                <p className="text-sm font-semibold text-rose-800">
                  Cancelling a token
                </p>
                <p className="mt-1 text-xs text-rose-700">
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
                    className="flex-1 rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {busy ? "Cancelling…" : `Confirm cancel Token #${selected.token_number}`}
                  </button>
                  <button
                    onClick={() => setConfirming(false)}
                    disabled={busy}
                    className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
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
                  className="mt-5 w-full rounded-xl border border-rose-600 px-4 py-3 text-sm font-semibold text-rose-700 hover:bg-rose-50"
                >
                  Cancel token
                </button>
              )}
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
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-800">{value}</dd>
    </div>
  );
}
