"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  baggedCount,
  fetchOrders,
  orderAction,
  statusLabel,
  uploadOrders,
  statusFirst,
  statusSorts,
  fetchStaff,
  staffLabel,
  PAGE_STEP,
  type Order,
  type Staff,
  type SortKey,
  type UploadIssue,
} from "@/app/components/shared/api";
import { PACKING_STATUSES } from "@/app/components/shared/queries";
import { useDebounced } from "@/app/components/shared/useDebounced";
import { useActionError } from "@/app/components/shared/useActionError";
import { useInfiniteScroll } from "@/app/components/shared/useInfiniteScroll";
import { usePolling } from "@/app/components/shared/usePolling";
import EmptyState from "@/app/components/dashboard/EmptyState";
import Loader from "@/app/components/dashboard/Loader";
import SortSelect from "@/app/components/dashboard/SortSelect";
import DetailPane from "@/app/components/dashboard/DetailPane";
import UploadErrorList from "@/app/components/dashboard/UploadErrorList";
import {
  BoxOpenIcon,
  ClipboardIcon,
  ClockIcon,
  PackingIcon,
  SearchIcon,
  TicketIcon,
  UploadIcon,
} from "@/app/components/dashboard/icons";

const SORT_OPTIONS: SortKey[] = [...statusSorts(PACKING_STATUSES), "name"];

// Bag assignment + handover to runner (set_bag_number permission).
export default function PackingQueue({
  initialOrders = [],
  initialTotal = 0,
}: {
  // Server-rendered first screenful. Without it the page paints, then the
  // browser makes a second cross-region round trip before anything shows.
  initialOrders?: Order[];
  initialTotal?: number;
} = {}) {
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>(statusFirst("PACKAGING_PENDING"));
  const [limit, setLimit] = useState(PAGE_STEP);
  const [total, setTotal] = useState(initialTotal);
  // Phone-only overlay; opens on tap, never from load()'s auto-select.
  const [detailOpen, setDetailOpen] = useState(false);
  const autoSelected = useRef(initialOrders.length > 0);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialOrders[0]?.order_id ?? null,
  );
  const [bagDrafts, setBagDrafts] = useState<Record<string, string>>({});
  const { error, setActionError, setLoadError, clearLoadError } = useActionError();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(initialOrders.length > 0);
  const [uploading, setUploading] = useState(false);
  const [uploadIssues, setUploadIssues] = useState<UploadIssue[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const [runners, setRunners] = useState<Staff[]>([]);
  const [runnerId, setRunnerId] = useState("");

  const search = useDebounced(query);

  // Runner list changes rarely, so it is fetched once rather than on the poll.
  useEffect(() => {
    void fetchStaff("RUNNER").then(setRunners);
  }, []);

  // A new search or sort means a different result set, so the window resets
  // here rather than in an effect — that avoids a cascading render and a wasted
  // fetch at the old limit before the reset lands.
  function changeQuery(next: string) {
    setQuery(next);
    setLimit(PAGE_STEP);
  }

  function changeSort(next: SortKey) {
    setSort(next);
    setLimit(PAGE_STEP);
  }

  const load = useCallback(async () => {
    try {
      const page = await fetchOrders({
        q: search,
        status: PACKING_STATUSES,
        sort,
        limit,
      });
      const data = page.orders;
      setOrders(data);
      setTotal(page.total);
      clearLoadError();
      // Only auto-select on the very first load. If the selected order later
      // leaves the queue (handed over, delivered, filtered out, or pushed past
      // the loaded window), clear the selection instead of silently jumping to
      // another order — otherwise the action buttons retarget under the user
      // and act on an order they never chose.
      setSelectedId((current) => {
        if (current && data.some((o) => o.order_id === current)) return current;
        if (current || autoSelected.current) return null;
        autoSelected.current = true;
        return data[0]?.order_id ?? null;
      });
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Failed to load orders");
    } finally {
      setLoaded(true);
    }
  }, [search, sort, limit, setLoadError, clearLoadError]);

  usePolling(load, 4000, initialOrders.length > 0);

  const order = orders.find((o) => o.order_id === selectedId) ?? null;

  const hasMore = orders.length < total;
  const sentinel = useInfiniteScroll(
    () => setLimit((n) => n + PAGE_STEP),
    hasMore,
  );

  // Counts describe the list as displayed, so they narrow with an active search.
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
    setActionError(null);
    setUploadIssues([]);
    const result = await uploadOrders(file);
    if (result.ok) {
      await load();
    } else {
      setUploadIssues(result.errors);
    }
    setUploading(false);
  }

  async function assignBag(lineId: string) {
    if (!order) return;
    const raw = bagDrafts[lineId]?.trim();
    const bagNumber = Number(raw);
    if (!raw || !Number.isInteger(bagNumber) || bagNumber < 1) {
      setActionError("Enter a positive bag number");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await orderAction(order.order_id, "set_bag_number", { lineId, bagNumber });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to set bag number");
    } finally {
      setBusy(false);
    }
  }

  async function handToRunner() {
    if (!order) return;
    if (!runnerId) {
      setActionError("Pick which runner is collecting this bag");
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await orderAction(order.order_id, "hand_to_runner", { runnerId });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to hand over");
    } finally {
      setBusy(false);
    }
  }

  const allBagged = order
    ? order.Order_Lines.every((l) => l.bag_number != null)
    : false;
  const canHandOver = order?.status === "TOKEN_ISSUED" && allBagged;

  return (
    <div className="space-y-6 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
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

      <div className="grid shrink-0 gap-4 sm:grid-cols-3">
        <Stat icon={<ClockIcon className="h-6 w-6" />} label="Pending" value={summary.pending} />
        <Stat icon={<PackingIcon className="h-6 w-6" />} label="Packaged" value={summary.packaged} />
        <Stat icon={<TicketIcon className="h-6 w-6" />} label="Token issued" value={summary.tokenIssued} />
      </div>

      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {uploadIssues.length ? <UploadErrorList issues={uploadIssues} /> : null}

      <div className="grid items-start gap-6 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:items-stretch">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:flex lg:min-h-0 lg:flex-col">
          <div className="flex shrink-0 items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Bag queue</h2>
              <p className="mt-1 text-sm text-slate-500">
                Assign bag numbers, then hand over after token is issued.
              </p>
            </div>
            <SortSelect value={sort} options={SORT_OPTIONS} onChange={changeSort} />
          </div>

          <div className="relative mt-4 shrink-0">
            <span className="pointer-events-none absolute inset-y-0 left-0 grid w-11 place-items-center text-slate-400">
              <SearchIcon className="h-5 w-5" />
            </span>
            <input
              value={query}
              onChange={(event) => changeQuery(event.target.value)}
              placeholder="Order id, customer, or phone"
              className="w-full rounded-lg border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {!loaded ? (
            <Loader label="Loading orders…" />
          ) : orders.length === 0 && search ? (
            <EmptyState
              icon={<BoxOpenIcon className="h-9 w-9" />}
              title="No order matched your search."
              subtitle="Try a different order id, customer, or phone."
            />
          ) : orders.length === 0 ? (
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
            <div className="mt-4 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              {orders.map((item) => (
                <button
                  key={item.order_id}
                  onClick={() => {
                    setSelectedId(item.order_id);
                    setDetailOpen(true);
                  }}
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
              {hasMore ? (
                <div
                  ref={sentinel}
                  className="py-3 text-center text-xs font-medium text-slate-400"
                >
                  Loading more… ({orders.length} of {total})
                </div>
              ) : null}
            </div>
          )}
        </section>

        <DetailPane
          open={detailOpen && !!order}
          title="orders"
          onClose={() => setDetailOpen(false)}
          error={error}
        >
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

              <label className="mt-6 block text-sm font-medium text-slate-700">
                Handing over to
                <select
                  value={runnerId}
                  onChange={(event) => setRunnerId(event.target.value)}
                  disabled={!canHandOver || busy}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">Select a runner…</option>
                  {runners.map((r) => (
                    <option key={r.id} value={r.id}>
                      {staffLabel("Runner", r)}
                    </option>
                  ))}
                </select>
              </label>

              <button
                onClick={handToRunner}
                disabled={!canHandOver || busy || !runnerId}
                className="mt-3 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
              >
                Hand over to runner
              </button>
              {!canHandOver ? (
                <p className="mt-3 text-center text-xs text-slate-400">
                  Needs token issued and every line bagged.
                </p>
              ) : runners.length === 0 ? (
                <p className="mt-3 text-center text-xs text-slate-400">
                  No active runners. Add one under Users.
                </p>
              ) : null}
            </>
          )}
        </DetailPane>
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
