"use client";

import { useEffect, useState } from "react";
import { Hanken_Grotesk } from "next/font/google";

const hankenGrotesk = Hanken_Grotesk({ subsets: ["latin"] });

type DisplayOrder = {
  token: number | null;
  order: string;
  readyAt: string;
  counter: string | null;
};

// The customer-facing pickup board is intentionally dark and high-contrast:
// it is shown on a wall-mounted screen, so oversized token numbers on a deep
// background read clearly from across the room. It uses the same blue brand
// accent as the rest of the app.
export default function CustomerDisplayPage() {
  const [orders, setOrders] = useState<DisplayOrder[]>([]);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => {
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
    <div className="flex h-dvh flex-col overflow-hidden bg-[#0a0e14] text-white">
      <header className="relative shrink-0 bg-[#0a0e14] px-5 py-5 text-center sm:px-8">
        <p className={`${hankenGrotesk.className} text-lg font-bold uppercase tracking-[0.28em] text-[#2ecc71] sm:text-xl`}>
          SAMSUNG BKC
        </p>
        <h1 className={`${hankenGrotesk.className} mt-1 text-2xl font-extrabold tracking-[0.06em] text-white sm:text-3xl`}>
          ORDER PICKUP STATUS
        </h1>
        <section className="mt-4 flex w-full items-center gap-3 rounded-lg border-l-4 border-[#2ecc71] bg-[rgba(46,204,113,0.16)] p-4 text-left shadow-[0_0_18px_rgba(46,204,113,0.16)]">
          <svg className="h-7 w-7 shrink-0 text-[#2ecc71]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4V5Z" />
            <path d="M15.5 8.5a5 5 0 0 1 0 7" />
            <path d="M18.5 5.5a9 9 0 0 1 0 13" />
          </svg>
          <div className="min-w-0 flex-1">
            <p className={`${hankenGrotesk.className} text-xs font-bold uppercase tracking-[0.16em] text-[#2ecc71]`}>
              Announcement
            </p>
            <p className={`${hankenGrotesk.className} mt-1 text-xl font-extrabold leading-snug text-white sm:text-2xl`}>
              Please Proceed to the right side Cash Counter for product pickup.
            </p>
          </div>
          <p className={`${hankenGrotesk.className} shrink-0 self-start text-lg font-bold tabular-nums text-[#2ecc71] sm:text-xl`}>
            {clock}
          </p>
        </section>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto px-6 py-8 sm:px-10">
        {orders.length === 0 ? (
          <div className="grid flex-1 place-items-center">
            <p className="text-2xl text-slate-500">No orders ready yet</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {orders.map((order) => (
              <article
                key={`${order.token}-${order.order}`}
                className="relative overflow-hidden rounded-lg border border-[#353940] border-l-4 border-l-[#93c5fd] bg-[#181c22] p-5 shadow-lg shadow-black/30 xl:border-l xl:border-l-[#353940] xl:border-b-2 xl:border-b-[#93c5fd]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className={`${hankenGrotesk.className} text-xs font-medium uppercase tracking-[0.2em] text-white/50`}>
                      Token
                    </p>
                    <p className={`${hankenGrotesk.className} mt-2 text-7xl font-extrabold leading-none tracking-tight text-white sm:text-8xl`}>
                      {String(order.token).padStart(2, "0")}
                    </p>
                  </div>
                  <span className={`${hankenGrotesk.className} rounded-full bg-blue-950 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-300`}>
                    Ready
                  </span>
                </div>
                <div className={`${hankenGrotesk.className} mt-5 flex items-center gap-2 text-lg font-bold text-[#2ecc71]`}>
                  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M3 21h18" />
                    <path d="M5 21V8l7-4 7 4v13" />
                    <path d="M9 21v-5h6v5" />
                    <path d="M9 10h.01M15 10h.01" />
                  </svg>
                  <span>{order.counter ?? "Pickup Counter"}</span>
                </div>
                <div className="my-5 h-px bg-white/10" />
                <p className={`${hankenGrotesk.className} text-xs font-medium uppercase tracking-[0.16em] text-white/45`}>
                  Order ID
                </p>
                <p className={`${hankenGrotesk.className} mt-1 text-sm font-medium text-white`}>
                  {order.order}
                </p>
              </article>
            ))}
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-white/10 px-8 py-4 text-center text-sm text-slate-500">
        Please keep your ID &amp; Invoice ready
      </footer>
    </div>
  );
}
