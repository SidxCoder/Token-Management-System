"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";
import EmptyState from "@/app/components/dashboard/EmptyState";
import {
  ClipboardListIcon,
  DocumentSearchIcon,
  InfoIcon,
  SearchIcon,
} from "@/app/components/dashboard/icons";

// Token issuing desk (issue_token permission).
export default function TokenDesk() {
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
    selected?.status === "PACKAGING_PENDING" || selected?.status === "PACKAGED";

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
      {orders.length === 0 ? (
        <section className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
            <InfoIcon className="h-6 w-6" />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">No orders yet</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              Tokens can only be issued after orders exist. A packager or admin must
              import the Excel sheet first.
            </p>
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 border-b border-slate-200">
        <TabButton active={view === "search"} onClick={() => setView("search")}>
          Search order
        </TabButton>
        <TabButton active={view === "issued"} onClick={() => setView("issued")}>
          Issued tokens
          <span className="ml-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
            {issued.length}
          </span>
        </TabButton>
      </div>

      {view === "search" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Search order</h2>
            <div className="relative mt-4">
              <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">
                <SearchIcon className="h-5 w-5" />
              </span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Order number, name, or phone"
                className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            {results.length ? (
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
                subtitle="Try searching with a different order number, name, or phone."
              />
            )}
          </section>

          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {!selected ? (
              <EmptyState
                icon={<ClipboardListIcon className="h-9 w-9" />}
                title="Select an order"
                subtitle="Choose a result to issue a token and view order details here."
                full
              />
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Order details
                </p>
                <h3 className="mt-2 text-xl font-bold text-slate-900">{selected.order_id}</h3>
                <dl className="mt-6 space-y-3 text-sm">
                  <Row label="Customer" value={selected.customer_name} />
                  <Row
                    label="Items"
                    value={`${selected.number_of_items} item${selected.number_of_items === 1 ? "" : "s"}`}
                  />
                  <Row label="Status" value={statusLabel(selected.status)} />
                  <Row
                    label="Token"
                    value={selected.token_number != null ? `#${selected.token_number}` : "—"}
                  />
                </dl>
                <button
                  onClick={issueToken}
                  disabled={!canIssue || busy}
                  className="mt-7 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-5">
            <h2 className="font-semibold text-slate-900">Issued tokens</h2>
            <p className="mt-1 text-sm text-slate-500">
              Orders that currently have a token number.
            </p>
          </div>
          {issued.length ? (
            <div className="divide-y divide-slate-100">
              {issued.map((order) => (
                <div
                  key={order.order_id}
                  className="flex items-center justify-between px-5 py-4"
                >
                  <div>
                    <p className="font-semibold text-slate-900">
                      Token #{String(order.token_number).padStart(3, "0")}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {order.order_id} · {order.customer_name}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))}
            </div>
          ) : (
            <p className="px-5 py-12 text-center text-sm text-slate-500">
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
      className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${
        active
          ? "border-blue-600 text-blue-700"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
