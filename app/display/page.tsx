"use client";

import { useEffect, useState } from "react";
import { ShieldLock } from "@/app/components/dashboard/icons";

type DisplayOrder = {
  token: number | null;
  order: string;
};

// The customer-facing pickup board is intentionally dark and high-contrast:
// it is shown on a wall-mounted screen, so oversized token numbers on a deep
// background read clearly from across the room. It uses the same blue brand
// accent as the rest of the app.
export default function CustomerDisplayPage() {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
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

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/display");
      if (!res.ok) return;
      const data = (await res.json()) as DisplayOrder[];
      setOrders(Array.isArray(data) ? data.filter((o) => o.token != null) : []);
    }
    void load();
    const id = window.setInterval(() => void load(), 3000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-gradient-to-b from-[#0b1430] to-[#060a15] text-white">
      <header className="flex items-center justify-between border-b border-white/10 px-8 py-6">
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-blue-500/15 text-blue-300">
            <ShieldLock className="h-7 w-7" />
          </span>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
              Pickup Display
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              Ready for Pickup
            </h1>
          </div>
        </div>
        <p className="font-mono text-2xl text-slate-400">{clock}</p>
      </header>

      <main className="flex flex-1 flex-col px-6 py-8 sm:px-10">
        {orders.length === 0 ? (
          <div className="grid flex-1 place-items-center">
            <p className="text-2xl text-slate-500">No orders ready yet</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {orders.map((order) => (
              <article
                key={`${order.token}-${order.order}`}
                className="rounded-3xl border border-white/10 bg-white/[0.03] px-8 py-10 text-center shadow-lg shadow-black/30"
              >
                <p className="text-sm font-semibold uppercase tracking-widest text-blue-300">
                  Token
                </p>
                <p className="mt-3 text-7xl font-black tracking-tight text-white sm:text-8xl">
                  {String(order.token).padStart(2, "0")}
                </p>
                <p className="mt-6 text-lg text-slate-400">{order.order}</p>
                <p className="mt-4 inline-block rounded-full bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300">
                  Ready for Pickup
                </p>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t border-white/10 px-8 py-4 text-center text-sm text-slate-500">
        Please proceed to the pickup counter when your token appears
      </footer>
    </div>
  );
}
