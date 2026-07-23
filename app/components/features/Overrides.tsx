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
  BagIcon,
  DocumentSearchIcon,
  OverridesIcon,
} from "@/app/components/dashboard/icons";

// Admin overrides: edit any bag number (assigned or not) and force an order to
// READY_FOR_PICKUP, skipping the runner step. Bag edits use set_bag_number,
// which lets admins change or clear an already-assigned bag; the bypass uses
// override_status. Both are admin-only permissions.
export default function Overrides() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [bypassing, setBypassing] = useState(false);
  const [bagDrafts, setBagDrafts] = useState<Record<string, string>>({});
  const [lineBusy, setLineBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setError(null);
    try {
      const data = await fetchOrders();
      const relevant = data.filter((order) => order.status !== "DELIVERED");
      setOrders(relevant);
      setSelectedOrderId((current) =>
        current && relevant.some((order) => order.order_id === current)
          ? current
          : (relevant[0]?.order_id ?? null),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load orders");
    }
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadOrders();
      setLoadingOrders(false);
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? orders.filter((order) =>
          `${order.order_id} ${order.customer_name} ${order.phone} ${order.status}`
            .toLowerCase()
            .includes(term),
        )
      : orders;
  }, [orders, search]);

  const selectedOrder = orders.find((o) => o.order_id === selectedOrderId) ?? null;
  const allBagged = selectedOrder
    ? selectedOrder.Order_Lines.every((l) => l.bag_number != null)
    : false;

  function draftFor(lineId: string, current: number | null) {
    return bagDrafts[lineId] ?? (current != null ? String(current) : "");
  }

  function clearDraft(lineId: string) {
    setBagDrafts((current) => {
      const next = { ...current };
      delete next[lineId];
      return next;
    });
  }

  async function updateBag(lineId: string, current: number | null) {
    const raw = draftFor(lineId, current).trim();
    const bagNumber = Number(raw);
    if (!raw || !Number.isInteger(bagNumber) || bagNumber < 1) {
      setError("Enter a positive bag number");
      return;
    }
    setLineBusy(lineId);
    setError(null);
    setMessage(null);
    try {
      await orderAction(selectedOrder!.order_id, "set_bag_number", {
        lineId,
        bagNumber,
      });
      clearDraft(lineId);
      setMessage(`Bag number updated to ${bagNumber}.`);
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update bag number");
    } finally {
      setLineBusy(null);
    }
  }

  async function clearBag(lineId: string) {
    setLineBusy(lineId);
    setError(null);
    setMessage(null);
    try {
      await orderAction(selectedOrder!.order_id, "set_bag_number", {
        lineId,
        bagNumber: null,
      });
      clearDraft(lineId);
      setMessage("Bag number cleared.");
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear bag number");
    } finally {
      setLineBusy(null);
    }
  }

  async function bypassToCashier() {
    if (!selectedOrder) return;
    if (!allBagged) {
      setError("Assign a bag number to every line before sending to cashier");
      return;
    }
    setBypassing(true);
    setError(null);
    setMessage(null);
    try {
      if (selectedOrder.token_number == null) {
        await orderAction(selectedOrder.order_id, "issue_token");
      }
      await orderAction(selectedOrder.order_id, "override_status", {
        status: "READY_FOR_PICKUP",
      });
      setMessage(`${selectedOrder.order_id} sent to cashier.`);
      await loadOrders();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Bypass failed");
    } finally {
      setBypassing(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
          <OverridesIcon className="h-6 w-6" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-slate-900">Order overrides</h2>
          <p className="mt-1 text-sm text-slate-500">
            Edit any bag number, then optionally force the order into{" "}
            <span className="font-semibold text-slate-700">READY_FOR_PICKUP</span> and skip
            the runner.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label className="mb-3 block text-sm font-medium text-slate-700">
            Search orders
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Order id, customer, phone, status"
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>

          <div className="max-h-96 space-y-2 overflow-auto pr-1">
            {loadingOrders ? (
              <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                Loading orders…
              </p>
            ) : filteredOrders.length ? (
              filteredOrders.map((order) => (
                <button
                  key={order.order_id}
                  onClick={() => {
                    setSelectedOrderId(order.order_id);
                    setBagDrafts({});
                    setMessage(null);
                    setError(null);
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedOrderId === order.order_id
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{order.order_id}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {statusLabel(order.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">
                    {order.customer_name} · {order.phone}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200">
                <EmptyState
                  icon={<DocumentSearchIcon className="h-9 w-9" />}
                  title="No orders available."
                  subtitle="Try adjusting your search."
                />
              </div>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {!selectedOrder ? (
            <EmptyState
              icon={<BagIcon className="h-9 w-9" />}
              title="Select an order"
              subtitle="Select an order to edit bags or force it to cashier."
              full
            />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Selected order
                </p>
                <h3 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedOrder.order_id}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedOrder.customer_name} · {selectedOrder.phone}
                </p>
              </div>

              <dl className="space-y-2 text-sm">
                <Row label="Current status" value={statusLabel(selectedOrder.status)} />
                <Row label="Items" value={String(selectedOrder.number_of_items)} />
                <Row
                  label="Bagged lines"
                  value={`${selectedOrder.Order_Lines.filter((l) => l.bag_number != null).length}/${selectedOrder.Order_Lines.length}`}
                />
              </dl>

              <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Bag numbers</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Set, change, or clear the bag number for any line.
                  </p>
                </div>

                <div className="space-y-3">
                  {selectedOrder.Order_Lines.map((line) => {
                    const busy = lineBusy === line.id;
                    return (
                      <div
                        key={line.id}
                        className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                      >
                        <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {line.product_name}
                        </span>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <input
                            value={draftFor(line.id, line.bag_number)}
                            onChange={(event) =>
                              setBagDrafts((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            placeholder="Bag number"
                            inputMode="numeric"
                            className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => updateBag(line.id, line.bag_number)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                          >
                            {busy ? "Saving…" : "Update"}
                          </button>
                          {line.bag_number != null ? (
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => clearBag(line.id)}
                              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                            >
                              Clear
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={bypassToCashier}
                disabled={bypassing || !allBagged}
                className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                {bypassing
                  ? "Sending…"
                  : selectedOrder.token_number != null
                    ? "Send to cashier"
                    : "Issue token and send to cashier"}
              </button>
              {!allBagged ? (
                <p className="text-center text-xs text-slate-500">
                  Assign every bag number to enable sending to cashier.
                </p>
              ) : (
                <p className="text-xs text-slate-500">
                  This issues a token if needed and sets the order to READY_FOR_PICKUP.
                </p>
              )}
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg bg-white px-3 py-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-800">{value}</dd>
    </div>
  );
}
