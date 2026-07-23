"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  orderAction,
  statusLabel,
  type Order,
} from "@/app/components/shared/api";
import EmptyState from "@/app/components/dashboard/EmptyState";
import {
  BoxOpenIcon,
  ClipboardIcon,
  ClockIcon,
  PackingIcon,
  TicketIcon,
  UploadIcon,
} from "@/app/components/dashboard/icons";

// Bag assignment + handover to runner (set_bag_number permission).
export default function PackingQueue() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bagDrafts, setBagDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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

  async function uploadExcel(file: File) {
    setUploading(true);
    setError(null);
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
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

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
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadExcel(file);
          event.target.value = "";
        }}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<ClockIcon className="h-6 w-6" />} label="Pending" value={summary.pending} />
        <Stat icon={<PackingIcon className="h-6 w-6" />} label="Packaged" value={summary.packaged} />
        <Stat icon={<TicketIcon className="h-6 w-6" />} label="Token issued" value={summary.tokenIssued} />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Bag queue</h2>
          <p className="mt-1 text-sm text-slate-500">
            Assign bag numbers, then hand over after token is issued.
          </p>
          {orders.length === 0 ? (
            <EmptyState
              icon={<BoxOpenIcon className="h-9 w-9" />}
              title="No packing orders."
              subtitle="Import an Excel file to begin."
              action={
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                >
                  <UploadIcon className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Import Excel"}
                </button>
              }
            />
          ) : (
            <div className="mt-4 space-y-3">
              {orders.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => setSelectedId(item.order_id)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    item.order_id === selectedId
                      ? "border-blue-500 bg-blue-50"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{item.order_id}</p>
                    <span className="text-xs font-semibold text-slate-500">
                      {statusLabel(item.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{item.customer_name}</p>
                  <p className="mt-2 text-xs text-slate-400">
                    {baggedCount(item)}/{item.Order_Lines.length} bagged
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {!order ? (
            <EmptyState
              icon={<ClipboardIcon className="h-9 w-9" />}
              title="Select an order from the queue."
              subtitle="Order details and bag information will appear here."
              full
            />
          ) : (
            <>
              <div className="flex items-start justify-between border-b border-slate-100 pb-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                    Order details
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-slate-900">{order.order_id}</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {order.customer_name}
                    {order.token_number != null ? ` · Token #${order.token_number}` : ""}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {statusLabel(order.status)}
                </span>
              </div>

              <div className="mt-6">
                <h3 className="font-semibold text-slate-900">Line bag numbers</h3>
                <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                  {order.Order_Lines.map((line) => (
                    <div
                      key={line.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <p className="flex-1 text-sm text-slate-700">{line.product_name}</p>
                      {line.bag_number != null ? (
                        <span className="text-sm font-semibold text-emerald-600">
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
                            className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                          />
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => assignBag(line.id)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
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
                className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Hand over to runner
              </button>
              {!canHandOver && (
                <p className="mt-3 text-center text-xs text-slate-400">
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

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-sm">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </span>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}
