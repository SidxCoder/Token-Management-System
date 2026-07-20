"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import UserManagement from "./UserManagement";
import { fetchOrders, orderAction, statusLabel, type Order } from "@/app/components/shared/api";

type Reports = {
  byStatus: Record<string, number>;
  tokens: { issuedToday: number; cancelledToday: number };
  deliveredToday: number;
};

export default function AdminDashboard() {
  const [reports, setReports] = useState<Reports | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [bypassing, setBypassing] = useState(false);
  const [bagDrafts, setBagDrafts] = useState<Record<string, string>>({});
  const [bypassError, setBypassError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    setBypassError(null);
    try {
      const data = await fetchOrders();
      const relevant = data.filter((order) => order.status !== "DELIVERED");
      setOrders(relevant);
      setSelectedOrderId((current) =>
        current && relevant.some((order) => order.order_id === current)
          ? current
          : relevant[0]?.order_id ?? null,
      );
    } catch (error) {
      setBypassError(error instanceof Error ? error.message : "Failed to load orders");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void (async () => {
        const res = await fetch("/api/admin/reports");
        if (!res.ok) return;
        const data = (await res.json()) as Reports;
        setReports(data);
      })();
    }, 0);
    const orderInitial = window.setTimeout(() => {
      void loadOrders();
      setLoadingOrders(false);
    }, 0);
    return () => {
      window.clearTimeout(initial);
      window.clearTimeout(orderInitial);
    };
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

  const selectedOrder =
    orders.find((order) => order.order_id === selectedOrderId) ?? null;

  const pendingBagLines = useMemo(
    () => selectedOrder?.Order_Lines.filter((line) => line.bag_number == null) ?? [],
    [selectedOrder],
  );

  async function uploadExcel(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/orders/upload", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          Array.isArray(data.errors) && data.errors[0]?.message
            ? data.errors[0].message
            : (data.error ?? "Upload failed");
        throw new Error(msg);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function bypassToCashier() {
    if (!selectedOrder) return;
    setBypassing(true);
    setBypassError(null);
    try {
      for (const line of pendingBagLines) {
        const raw = bagDrafts[line.id]?.trim();
        if (!raw) {
          throw new Error(`Bag number is required for "${line.product_name}"`);
        }
        const bagNumber = Number(raw);
        if (!Number.isInteger(bagNumber) || bagNumber < 1) {
          throw new Error(`Invalid bag number for "${line.product_name}"`);
        }
        await orderAction(selectedOrder.order_id, "set_bag_number", {
          lineId: line.id,
          bagNumber,
        });
      }

      if (selectedOrder.token_number == null) {
        await orderAction(selectedOrder.order_id, "issue_token");
      }
      await orderAction(selectedOrder.order_id, "override_status", {
        status: "READY_FOR_PICKUP",
      });
      setBagDrafts({});
      await loadOrders();
    } catch (error) {
      setBypassError(error instanceof Error ? error.message : "Bypass failed");
    } finally {
      setBypassing(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Import orders</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Admin can import the Excel sheet here. Packager has the same permission.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
            {uploading ? "Uploading…" : "Upload Excel"}
            <input
              type="file"
              accept=".xlsx"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadExcel(file);
                event.target.value = "";
              }}
            />
          </label>
        </div>
        {uploadError ? (
          <p className="mt-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {uploadError}
          </p>
        ) : null}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Direct to cashier</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Force an order into <span className="font-semibold">READY_FOR_PICKUP</span> and skip the runner step.
            </p>
          </div>
          <div className="text-sm text-zinc-500">
            Cashier dashboard reads this status directly.
          </div>
        </div>

        {bypassError ? (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {bypassError}
          </p>
        ) : null}

        <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <label className="mb-3 block text-sm font-medium text-zinc-700">
              Search orders
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Order id, customer, phone, status"
                className="mt-1.5 w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
            </label>

            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {loadingOrders ? (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
                  Loading orders…
                </p>
              ) : filteredOrders.length ? (
                filteredOrders.map((order) => (
                  <button
                    key={order.order_id}
                    onClick={() => setSelectedOrderId(order.order_id)}
                    className={`w-full rounded-xl border p-4 text-left transition ${
                      selectedOrderId === order.order_id
                        ? "border-indigo-500 bg-indigo-50"
                        : "border-zinc-200 hover:border-indigo-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-zinc-900">{order.order_id}</p>
                      <span className="text-xs font-semibold text-zinc-500">
                        {statusLabel(order.status)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {order.customer_name} · {order.phone}
                    </p>
                  </button>
                ))
              ) : (
                <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-8 text-center text-sm text-zinc-500">
                  No orders available for bypass.
                </p>
              )}
            </div>
          </div>

          <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
            {!selectedOrder ? (
              <p className="py-10 text-center text-sm text-zinc-500">
                Select an order to force it to cashier.
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
                    Selected order
                  </p>
                  <h3 className="mt-1 text-xl font-bold text-zinc-900">
                    {selectedOrder.order_id}
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedOrder.customer_name} · {selectedOrder.phone}
                  </p>
                </div>

                <dl className="space-y-2 text-sm">
                  <Row label="Current status" value={statusLabel(selectedOrder.status)} />
                  <Row label="Items" value={String(selectedOrder.number_of_items)} />
                  <Row
                    label="Bagged lines"
                    value={`${selectedOrder.bagged_count ?? 0}/${selectedOrder.Order_Lines.length}`}
                  />
                </dl>

                {pendingBagLines.length ? (
                  <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 bg-white p-4">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">
                        Add missing bag numbers
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Fill every empty bag number before sending this order to cashier.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {pendingBagLines.map((line) => (
                        <label
                          key={line.id}
                          className="block rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3"
                        >
                          <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-500">
                            {line.product_name}
                          </span>
                          <input
                            value={bagDrafts[line.id] ?? ""}
                            onChange={(event) =>
                              setBagDrafts((current) => ({
                                ...current,
                                [line.id]: event.target.value,
                              }))
                            }
                            placeholder="Bag number"
                            inputMode="numeric"
                            className="mt-2 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={bypassToCashier}
                  disabled={bypassing}
                  className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bypassing ? "Sending…" : pendingBagLines.length ? "Save bags and send to cashier" : "Issue token and send to cashier"}
                </button>

                <p className="text-xs text-zinc-500">
                  This will fill missing bag numbers, issue a token if needed, and set the order to READY_FOR_PICKUP.
                </p>
              </div>
            )}
          </aside>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Tokens issued today"
          value={reports?.tokens.issuedToday ?? "—"}
        />
        <Stat
          label="Delivered today"
          value={reports?.deliveredToday ?? "—"}
        />
        <Stat
          label="Cancelled today"
          value={reports?.tokens.cancelledToday ?? "—"}
        />
      </div>
      <UserManagement />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 rounded-lg bg-white px-3 py-2">
      <dt className="text-zinc-500">{label}</dt>
      <dd className="font-semibold text-zinc-800">{value}</dd>
    </div>
  );
}
