"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";

export default function GreeterDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"search" | "issued">("search");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [load]);

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? orders.filter((order) =>
          `${order.order_id} ${order.customer_name} ${order.phone}`
            .toLowerCase()
            .includes(search),
        )
      : orders;
  }, [orders, query]);

  const issued = useMemo(
    () =>
      orders
        .filter((o) => o.token_number != null)
        .sort((a, b) => (b.token_number ?? 0) - (a.token_number ?? 0)),
    [orders],
  );

  const selected = orders.find((o) => o.order_id === selectedId) ?? null;
  const canIssue =
    selected?.status === "PACKAGING_PENDING" ||
    selected?.status === "PACKAGED";

  async function issueToken() {
    if (!selected || !canIssue) return;
    setBusy(true);
    setError(null);
    try {
      await orderAction(selected.order_id, "issue_token");
      await load();
      setView("issued");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue token");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-emerald-700 px-6 py-6 text-white shadow-sm sm:px-8">
        <p className="text-sm font-semibold text-emerald-100">GREETER DESK</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="mt-1 text-sm text-emerald-100">
              Find a customer&apos;s order and issue their collection token.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3">
            <p className="text-xs text-emerald-100">Tokens with numbers</p>
            <p className="text-2xl font-bold">{issued.length}</p>
          </div>
        </div>
      </section>

      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex gap-2 border-b border-zinc-200">
        <TabButton active={view === "search"} onClick={() => setView("search")}>
          Search order
        </TabButton>
        <TabButton active={view === "issued"} onClick={() => setView("issued")}>
          Issued tokens
          <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
            {issued.length}
          </span>
        </TabButton>
      </div>

      {view === "search" ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-800">
                Search order
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Order number, name, or phone"
                className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </label>
            <div className="mt-5 space-y-3">
              {results.map((order) => (
                <button
                  key={order.order_id}
                  onClick={() => setSelectedId(order.order_id)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left ${
                    selectedId === order.order_id
                      ? "border-emerald-500 bg-emerald-50"
                      : "border-zinc-200 hover:border-emerald-300"
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
              ))}
              {results.length === 0 && (
                <p className="py-8 text-center text-sm text-zinc-500">
                  No order matched your search.
                </p>
              )}
            </div>
          </section>

          <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            {!selected ? (
              <div className="grid min-h-56 place-items-center text-center">
                <div>
                  <p className="text-lg font-semibold text-zinc-800">
                    Select an order
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Choose a result to issue a token.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  Order details
                </p>
                <h3 className="mt-2 text-xl font-bold">{selected.order_id}</h3>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row label="Customer" value={selected.customer_name} />
                  <Row
                    label="Items"
                    value={`${selected.number_of_items} item${selected.number_of_items === 1 ? "" : "s"}`}
                  />
                  <Row label="Status" value={statusLabel(selected.status)} />
                  <Row
                    label="Token"
                    value={
                      selected.token_number != null
                        ? `#${selected.token_number}`
                        : "—"
                    }
                  />
                </dl>
                <button
                  onClick={issueToken}
                  disabled={!canIssue || busy}
                  className="mt-7 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
                >
                  {busy
                    ? "Issuing…"
                    : canIssue
                      ? "Issue token"
                      : selected.token_number != null
                        ? "Token already issued"
                        : "Cannot issue yet"}
                </button>
              </>
            )}
          </aside>
        </div>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-5 py-5">
            <h2 className="font-semibold">Issued tokens</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Orders that currently have a token number.
            </p>
          </div>
          {issued.length ? (
            <div className="divide-y divide-zinc-100">
              {issued.map((order) => (
                <div
                  key={order.order_id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="font-semibold">
                      Token #{String(order.token_number).padStart(3, "0")}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {order.order_id} · {order.customer_name}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-zinc-500">
              No tokens issued yet.
            </p>
          )}
        </section>
      )}
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

function TabButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-b-2 px-3 py-3 text-sm font-semibold ${
        active
          ? "border-emerald-600 text-emerald-700"
          : "border-transparent text-zinc-500"
      }`}
    >
      {children}
    </button>
  );
}
