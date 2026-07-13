"use client";

import { useMemo, useState } from "react";

type Order = {
  id: string;
  customer: string;
  phone: string;
  items: number;
  status: "Ready" | "Packing" | "Token issued";
};

type IssuedToken = {
  number: number;
  orderId: string;
  customer: string;
  issuedAt: string;
};

const initialOrders: Order[] = [
  { id: "ORD-1042", customer: "Ananya Patel", phone: "••••• 2084", items: 4, status: "Ready" },
  { id: "ORD-1043", customer: "Kabir Singh", phone: "••••• 7931", items: 2, status: "Ready" },
  { id: "ORD-1044", customer: "Meera Nair", phone: "••••• 4217", items: 5, status: "Packing" },
  { id: "ORD-1045", customer: "Arjun Rao", phone: "••••• 9160", items: 1, status: "Ready" },
];

export default function GreeterDashboard() {
  const [orders, setOrders] = useState(initialOrders);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [issuedTokens, setIssuedTokens] = useState<IssuedToken[]>([]);
  const [view, setView] = useState<"search" | "issued">("search");

  const results = useMemo(() => {
    const search = query.trim().toLowerCase();
    return search
      ? orders.filter((order) => `${order.id} ${order.customer}`.toLowerCase().includes(search))
      : orders;
  }, [orders, query]);

  const selectedOrder = orders.find((order) => order.id === selectedId) ?? null;

  function issueToken() {
    if (!selectedOrder || selectedOrder.status !== "Ready") return;
    const token: IssuedToken = {
      number: issuedTokens.length + 1,
      orderId: selectedOrder.id,
      customer: selectedOrder.customer,
      issuedAt: new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date()),
    };
    setIssuedTokens((current) => [token, ...current]);
    setOrders((current) => current.map((order) => order.id === selectedOrder.id ? { ...order, status: "Token issued" } : order));
    setView("issued");
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-emerald-700 px-6 py-6 text-white shadow-sm sm:px-8">
        <p className="text-sm font-semibold text-emerald-100">GREETER DESK</p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h2 className="text-2xl font-bold">Welcome back</h2><p className="mt-1 text-sm text-emerald-100">Find a customer&apos;s ready order and issue their collection token.</p></div>
          <div className="rounded-xl bg-white/10 px-4 py-3"><p className="text-xs text-emerald-100">Tokens issued today</p><p className="text-2xl font-bold">{issuedTokens.length}</p></div>
        </div>
      </section>

      <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <TabButton active={view === "search"} onClick={() => setView("search")}>Search order</TabButton>
        <TabButton active={view === "issued"} onClick={() => setView("issued")}>Issued tokens <span className="ml-1 rounded-full bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">{issuedTokens.length}</span></TabButton>
      </div>

      {view === "search" ? (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6">
            <label className="block"><span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">Search order</span><span className="relative mt-2 block"><span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-zinc-400">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Order number or customer name" className="w-full rounded-xl border border-zinc-300 bg-white py-3 pl-10 pr-4 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" /></span></label>
            <div className="mt-5 space-y-3">
              {results.map((order) => <button key={order.id} onClick={() => setSelectedId(order.id)} className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${selectedId === order.id ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30" : "border-zinc-200 hover:border-emerald-300 dark:border-zinc-800"}`}><div><p className="font-semibold text-zinc-900 dark:text-zinc-50">{order.id}</p><p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{order.customer} · {order.phone}</p></div><StatusBadge status={order.status} /></button>)}
              {results.length === 0 && <p className="py-8 text-center text-sm text-zinc-500">No order matched your search.</p>}
            </div>
          </section>

          <OrderPanel order={selectedOrder} onIssue={issueToken} />
        </div>
      ) : <IssuedTokens tokens={issuedTokens} />}
    </div>
  );
}

function OrderPanel({ order, onIssue }: { order: Order | null; onIssue: () => void }) {
  if (!order) return <aside className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-zinc-300 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-950"><div><p className="text-lg font-semibold text-zinc-800 dark:text-zinc-100">Select an order</p><p className="mt-2 text-sm text-zinc-500">Choose a search result to review it and issue a token.</p></div></aside>;
  const canIssue = order.status === "Ready";
  return <aside className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">Order details</p><h3 className="mt-2 text-xl font-bold text-zinc-900 dark:text-zinc-50">{order.id}</h3><dl className="mt-6 space-y-4 text-sm"><Detail label="Customer" value={order.customer} /><Detail label="Items" value={`${order.items} item${order.items === 1 ? "" : "s"}`} /><Detail label="Order status" value={order.status} /></dl><button onClick={onIssue} disabled={!canIssue} className="mt-7 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700">{canIssue ? "Issue token" : "Token already issued"}</button>{!canIssue && order.status === "Packing" && <p className="mt-3 text-center text-xs text-amber-700 dark:text-amber-400">This order is still being packed.</p>}</aside>;
}

function IssuedTokens({ tokens }: { tokens: IssuedToken[] }) {
  return <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><div className="border-b border-zinc-100 px-5 py-5 dark:border-zinc-800"><h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Issued tokens</h2><p className="mt-1 text-sm text-zinc-500">Tokens issued during this browser session.</p></div>{tokens.length ? <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{tokens.map((token) => <div key={token.number} className="flex items-center justify-between px-5 py-4"><div><p className="font-semibold text-zinc-900 dark:text-zinc-50">Token #{String(token.number).padStart(3, "0")}</p><p className="mt-1 text-sm text-zinc-500">{token.orderId} · {token.customer}</p></div><p className="text-sm text-zinc-500">{token.issuedAt}</p></div>)}</div> : <p className="px-5 py-12 text-center text-sm text-zinc-500">No tokens have been issued yet.</p>}</section>;
}

function StatusBadge({ status }: { status: Order["status"] }) {
  const classes = status === "Ready" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : status === "Packing" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300";
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{status}</span>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-center justify-between gap-4"><dt className="text-zinc-500">{label}</dt><dd className="font-semibold text-zinc-800 dark:text-zinc-100">{value}</dd></div>;
}

function TabButton({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) {
  return <button onClick={onClick} className={`border-b-2 px-3 py-3 text-sm font-semibold transition ${active ? "border-emerald-600 text-emerald-700 dark:text-emerald-400" : "border-transparent text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"}`}>{children}</button>;
}
