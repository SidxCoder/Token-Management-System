"use client";

import { useMemo, useState } from "react";

type ItemStatus =
  | "Pending"
  | "Received from runner"
  | "Verified"
  | "Delivered to Customer";

type OrderStatus =
  | "Waiting for Runner"
  | "Partially Received"
  | "Ready for Customer"
  | "Partially Delivered"
  | "Completed";

type OrderItem = {
  id: string;
  name: string;
  quantity: number;
  status: ItemStatus;
};

type CashierOrder = {
  id: string;
  token: number;
  bagNumber: string;
  customer: string;
  phone: string;
  items: OrderItem[];
};

const initialOrders: CashierOrder[] = [
  {
    id: "ORD-1042",
    token: 12,
    bagNumber: "B-12",
    customer: "Ananya Patel",
    phone: "••••• 2084",
    items: [
      {
        id: "1",
        name: "Galaxy S25 Ultra",
        quantity: 1,
        status: "Received from runner",
      },
      {
        id: "2",
        name: "Galaxy Buds3 Pro",
        quantity: 1,
        status: "Received from runner",
      },
      {
        id: "3",
        name: "45W Power Adapter",
        quantity: 1,
        status: "Pending",
      },
    ],
  },
  {
    id: "ORD-1047",
    token: 15,
    bagNumber: "B-14",
    customer: "Dev Malhotra",
    phone: "••••• 7931",
    items: [
      {
        id: "4",
        name: "Galaxy S24 FE",
        quantity: 1,
        status: "Verified",
      },
      {
        id: "5",
        name: "Silicone Case",
        quantity: 1,
        status: "Verified",
      },
    ],
  },
  {
    id: "ORD-1051",
    token: 18,
    bagNumber: "B-15",
    customer: "Sara Khan",
    phone: "••••• 4217",
    items: [
      {
        id: "6",
        name: "Galaxy Z Fold6",
        quantity: 1,
        status: "Delivered to Customer",
      },
      {
        id: "7",
        name: "Galaxy Watch7",
        quantity: 1,
        status: "Received from runner",
      },
    ],
  },
  {
    id: "ORD-1055",
    token: 21,
    bagNumber: "B-18",
    customer: "Arjun Rao",
    phone: "••••• 9160",
    items: [
      {
        id: "8",
        name: "Galaxy Tab S9",
        quantity: 1,
        status: "Pending",
      },
      {
        id: "9",
        name: "Book Cover",
        quantity: 1,
        status: "Pending",
      },
    ],
  },
];

export default function CashierDashboard() {
  const [orders, setOrders] = useState(initialOrders);
  const [selectedId, setSelectedId] = useState(initialOrders[0].id);
  const [verifyToken, setVerifyToken] = useState("");

  const order = orders.find((item) => item.id === selectedId)!;

  const summary = useMemo(
    () => ({
      waiting: orders.filter((item) => orderStatus(item) === "Waiting for Runner")
        .length,
      partial: orders.filter((item) =>
        ["Partially Received", "Partially Delivered"].includes(orderStatus(item)),
      ).length,
      ready: orders.filter((item) => orderStatus(item) === "Ready for Customer")
        .length,
      completed: orders.filter((item) => orderStatus(item) === "Completed")
        .length,
    }),
    [orders],
  );

  const received = order.items.filter(
    (item) => item.status === "Received from runner",
  );
  const verified = order.items.filter((item) => item.status === "Verified");
  const delivered = order.items.filter(
    (item) => item.status === "Delivered to Customer",
  );
  const tokenMatches =
    verifyToken.trim() === "" || Number(verifyToken.trim()) === order.token;

  function updateOrder(update: (current: CashierOrder) => CashierOrder) {
    setOrders((current) =>
      current.map((item) => (item.id === selectedId ? update(item) : item)),
    );
  }

  function verifyReceivedItems() {
    updateOrder((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.status === "Received from runner"
          ? { ...item, status: "Verified" }
          : item,
      ),
    }));
  }

  function handOverVerifiedItems() {
    updateOrder((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.status === "Verified"
          ? { ...item, status: "Delivered to Customer" }
          : item,
      ),
    }));
  }

  function handOverAllAvailable() {
    updateOrder((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.status === "Received from runner" || item.status === "Verified"
          ? { ...item, status: "Delivered to Customer" }
          : item,
      ),
    }));
  }

  function toggleItemVerify(itemId: string) {
    updateOrder((current) => ({
      ...current,
      items: current.items.map((item) => {
        if (item.id !== itemId) return item;
        if (item.status === "Received from runner") {
          return { ...item, status: "Verified" };
        }
        if (item.status === "Verified") {
          return { ...item, status: "Received from runner" };
        }
        return item;
      }),
    }));
  }

  function deliverSingleItem(itemId: string) {
    updateOrder((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === itemId &&
        (item.status === "Verified" || item.status === "Received from runner")
          ? { ...item, status: "Delivered to Customer" }
          : item,
      ),
    }));
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Count label="Waiting for runner" value={summary.waiting} tone="text-zinc-700" />
        <Count label="Partial orders" value={summary.partial} tone="text-amber-700" />
        <Count label="Ready for customer" value={summary.ready} tone="text-violet-700" />
        <Count label="Completed" value={summary.completed} tone="text-emerald-700" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.4fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
              Incoming orders
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Bags and items received from the runner.
            </p>
          </div>
          <div className="space-y-3">
            {orders.map((item) => {
              const status = orderStatus(item);
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setVerifyToken("");
                  }}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    item.id === selectedId
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : "border-zinc-200 hover:border-violet-300 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-50">
                      Token #{item.token}
                    </p>
                    <OrderBadge status={status} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">
                    {item.id} · {item.customer}
                  </p>
                  <p className="mt-3 text-xs text-zinc-500">
                    Bag {item.bagNumber} · {deliveredCount(item)}/
                    {item.items.length} delivered
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
          <div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-700 dark:text-violet-400">
                Order details
              </p>
              <h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">
                Token #{order.token} · {order.bagNumber}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">
                {order.id} · {order.customer} · {order.phone}
              </p>
            </div>
            <OrderBadge status={orderStatus(order)} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <Progress
              label="Received from runner"
              value={`${received.length + verified.length + delivered.length}/${order.items.length}`}
            />
            <Progress
              label="Verified"
              value={`${verified.length + delivered.length}/${order.items.length}`}
            />
            <Progress
              label="Delivered to customer"
              value={`${delivered.length}/${order.items.length}`}
            />
          </div>

          <label className="mt-5 block max-w-xs text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            Verify token number
            <input
              value={verifyToken}
              onChange={(event) => setVerifyToken(event.target.value)}
              placeholder={`Expected: ${order.token}`}
              className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
            />
          </label>
          {verifyToken.trim() !== "" && !tokenMatches && (
            <p className="mt-2 text-xs text-red-600 dark:text-red-400">
              Token does not match this order.
            </p>
          )}

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                Bag & item details
              </h3>
              <span className="text-sm text-zinc-500">
                {deliveredCount(order)}/{order.items.length} delivered
              </span>
            </div>
            <div className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm ${
                        item.status === "Delivered to Customer"
                          ? "text-zinc-400 line-through"
                          : "text-zinc-800 dark:text-zinc-100"
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Qty ×{item.quantity}
                    </p>
                  </div>
                  <ItemBadge status={item.status} />
                  <div className="flex gap-2">
                    {(item.status === "Received from runner" ||
                      item.status === "Verified") && (
                      <button
                        type="button"
                        onClick={() => toggleItemVerify(item.id)}
                        disabled={!tokenMatches}
                        className="rounded-lg border border-violet-300 px-2.5 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-violet-700 dark:text-violet-300 dark:hover:bg-violet-950/40"
                      >
                        {item.status === "Verified" ? "Unverify" : "Verify"}
                      </button>
                    )}
                    {(item.status === "Verified" ||
                      item.status === "Received from runner") && (
                      <button
                        type="button"
                        onClick={() => deliverSingleItem(item.id)}
                        disabled={!tokenMatches}
                        className="rounded-lg border border-emerald-300 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
                      >
                        Hand over
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={verifyReceivedItems}
              disabled={!received.length || !tokenMatches}
              className="flex-1 rounded-xl border border-violet-600 px-4 py-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 dark:text-violet-300 dark:hover:bg-violet-950/30 dark:disabled:border-zinc-800"
            >
              Verify received items
              {received.length ? ` (${received.length})` : ""}
            </button>
            <button
              onClick={handOverVerifiedItems}
              disabled={!verified.length || !tokenMatches}
              className="flex-1 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700"
            >
              Hand over verified
              {verified.length ? ` (${verified.length})` : ""}
            </button>
          </div>

          <button
            onClick={handOverAllAvailable}
            disabled={
              !(received.length + verified.length) ||
              !tokenMatches ||
              orderStatus(order) === "Completed"
            }
            className="mt-3 w-full rounded-xl border border-emerald-600 px-4 py-3 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:text-zinc-400 dark:text-emerald-400 dark:hover:bg-emerald-950/30 dark:disabled:border-zinc-800"
          >
            {orderStatus(order) === "Completed"
              ? "Order completed"
              : "Hand over all available items to customer"}
          </button>

          {!tokenMatches && (
            <p className="mt-3 text-center text-xs text-zinc-500">
              Enter the matching token number before verifying or handing over
              items.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function orderStatus(order: CashierOrder): OrderStatus {
  const statuses = order.items.map((item) => item.status);
  const allDelivered = statuses.every(
    (status) => status === "Delivered to Customer",
  );
  if (allDelivered) return "Completed";

  const anyDelivered = statuses.includes("Delivered to Customer");
  const anyPending = statuses.includes("Pending");
  const anyReceived = statuses.some(
    (status) =>
      status === "Received from runner" ||
      status === "Verified" ||
      status === "Delivered to Customer",
  );
  const allReceived = statuses.every((status) => status !== "Pending");

  if (anyDelivered && anyPending) return "Partially Delivered";
  if (anyDelivered) return "Partially Delivered";
  if (allReceived) return "Ready for Customer";
  if (anyReceived) return "Partially Received";
  return "Waiting for Runner";
}

function deliveredCount(order: CashierOrder) {
  return order.items.filter((item) => item.status === "Delivered to Customer")
    .length;
}

function Count({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}

function Progress({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className="mt-1 font-semibold text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
    </div>
  );
}

function OrderBadge({ status }: { status: OrderStatus }) {
  const classes =
    status === "Completed"
      ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
      : status === "Ready for Customer"
        ? "bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300"
        : status === "Partially Delivered" || status === "Partially Received"
          ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
          : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}
    >
      {status}
    </span>
  );
}

function ItemBadge({ status }: { status: ItemStatus }) {
  const classes =
    status === "Pending"
      ? "text-zinc-500"
      : status === "Received from runner"
        ? "text-blue-700 dark:text-blue-400"
        : status === "Verified"
          ? "text-violet-700 dark:text-violet-400"
          : "text-emerald-700 dark:text-emerald-400";

  return (
    <span className={`w-40 shrink-0 text-right text-xs font-semibold ${classes}`}>
      {status}
    </span>
  );
}
