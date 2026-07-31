"use client";

import { useEffect, useState } from "react";
import { ShieldLock } from "@/app/components/dashboard/icons";

type DisplayOrder = {
  token: number | null;
  order: string;
  readyAt: string;
};

const STORE_NAME = "Samsung BKC";

// How long the customer has been waiting since the order hit the counter.
// Recomputed against a ticking clock so it counts up between the 3s polls.
function waitingFor(readyAt: string, now: number) {
  const ms = Math.max(0, now - new Date(readyAt).getTime());
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
}

// Long waits should be obvious from across the room.
function waitTone(readyAt: string, now: number) {
  const minutes = (now - new Date(readyAt).getTime()) / 60_000;
  if (minutes >= 15) return "bg-red-500/20 text-red-300";
  if (minutes >= 5) return "bg-amber-500/20 text-amber-300";
  return "bg-white/10 text-slate-300";
}

// The customer-facing pickup board is intentionally dark and high-contrast:
// it is shown on a wall-mounted screen, so oversized token numbers on a deep
// background read clearly from across the room. It uses the same blue brand
// accent as the rest of the app.
export default function CustomerDisplayPage() {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [clock, setClock] = useState("");
  // Drives the per-order waiting timers; the same tick already runs for the
  // wall clock, so this costs nothing extra.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tick = () => {
      setNow(Date.now());
      setClock(
        new Intl.DateTimeFormat("en-IN", {
          hour: "numeric",
          minute: "2-digit",
          second: "2-digit",
        }).format(new Date()),
      );
    };
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
              {STORE_NAME}
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
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <span className="inline-block rounded-full bg-blue-500/15 px-4 py-2 text-sm font-semibold text-blue-300">
                    Ready for Pickup
                  </span>
                  <span
                    className={`inline-block rounded-full px-4 py-2 text-sm font-semibold tabular-nums ${waitTone(order.readyAt, now)}`}
                  >
                    waiting {waitingFor(order.readyAt, now)}
                  </span>
                </div>
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
