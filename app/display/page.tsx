"use client";

import { useEffect, useState } from "react";

type DisplayOrder = {
  token: number;
  orderId: string;
};

const demoReadyOrders: DisplayOrder[] = [
  { token: 12, orderId: "ORD-1042" },
  { token: 15, orderId: "ORD-1047" },
  { token: 18, orderId: "ORD-1051" },
];

function maskOrderId(orderId: string) {
  if (orderId.length <= 4) return orderId;
  return `${orderId.slice(0, 3)}•••${orderId.slice(-2)}`;
}

export default function CustomerDisplayPage() {
  const [orders, setOrders] = useState(demoReadyOrders);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  // Demo refresh placeholder — later this will poll /api/display
  useEffect(() => {
    setOrders(demoReadyOrders);
  }, []);

  return (
    <div className="flex min-h-full flex-1 flex-col bg-zinc-950 text-white">
      <header className="flex items-center justify-between border-b border-zinc-800 px-8 py-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Pickup Display
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Ready for Pickup
          </h1>
        </div>
        <p className="font-mono text-2xl text-zinc-400">{clock}</p>
      </header>

      <main className="flex flex-1 flex-col px-6 py-8 sm:px-10">
        {orders.length === 0 ? (
          <div className="grid flex-1 place-items-center">
            <p className="text-2xl text-zinc-500">No orders ready yet</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <article
                key={order.token}
                className="rounded-3xl border border-zinc-800 bg-zinc-900 px-8 py-10 text-center shadow-lg"
              >
                <p className="text-sm font-semibold uppercase tracking-widest text-zinc-400">
                  Token
                </p>
                <p className="mt-3 text-7xl font-black tracking-tight text-emerald-400 sm:text-8xl">
                  {String(order.token).padStart(2, "0")}
                </p>
                <p className="mt-6 text-lg text-zinc-400">
                  {maskOrderId(order.orderId)}
                </p>
                <p className="mt-4 inline-block rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-semibold text-emerald-400">
                  Ready for Pickup
                </p>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-zinc-800 px-8 py-4 text-center text-sm text-zinc-500">
        Please proceed to the pickup counter when your token appears
      </footer>
    </div>
  );
}
