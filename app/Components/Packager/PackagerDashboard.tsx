"use client";

import { useMemo, useState } from "react";

type ProductStatus = "Pending" | "Packed" | "Handed to runner";
type Product = { id: number; name: string; quantity: number; status: ProductStatus };
type Bag = { id: string; customer: string; bagNumber: string; products: Product[] };

const initialBags: Bag[] = [
  { id: "ORD-1042", customer: "Ananya Patel", bagNumber: "", products: [{ id: 1, name: "Galaxy S25 Ultra", quantity: 1, status: "Pending" }, { id: 2, name: "Galaxy Buds3 Pro", quantity: 1, status: "Pending" }, { id: 3, name: "45W Power Adapter", quantity: 1, status: "Pending" }] },
  { id: "ORD-1047", customer: "Dev Malhotra", bagNumber: "B-14", products: [{ id: 1, name: "Galaxy S24 FE", quantity: 1, status: "Packed" }, { id: 2, name: "Silicone Case", quantity: 1, status: "Pending" }] },
  { id: "ORD-1051", customer: "Sara Khan", bagNumber: "B-15", products: [{ id: 1, name: "Galaxy Z Fold6", quantity: 1, status: "Handed to runner" }, { id: 2, name: "Galaxy Watch7", quantity: 1, status: "Pending" }] },
];

export default function PackagerDashboard() {
  const [bags, setBags] = useState(initialBags);
  const [selectedId, setSelectedId] = useState(initialBags[0].id);
  const bag = bags.find((current) => current.id === selectedId)!;
  const packedProducts = bag.products.filter((product) => product.status === "Packed");
  const summary = useMemo(() => ({
    pending: bags.filter((current) => bagStatus(current) === "Pending").length,
    partial: bags.filter((current) => ["Partially Packed", "Partial Handover"].includes(bagStatus(current))).length,
    handedOver: bags.filter((current) => bagStatus(current) === "Handed to runner").length,
  }), [bags]);

  function updateBag(update: (current: Bag) => Bag) {
    setBags((current) => current.map((item) => item.id === selectedId ? update(item) : item));
  }

  function togglePacked(productId: number) {
    updateBag((current) => ({ ...current, products: current.products.map((product) => product.id === productId && product.status !== "Handed to runner" ? { ...product, status: product.status === "Packed" ? "Pending" : "Packed" } : product) }));
  }

  function handOverPackedProducts() {
    if (!packedProducts.length) return;
    updateBag((current) => ({ ...current, products: current.products.map((product) => product.status === "Packed" ? { ...product, status: "Handed to runner" } : product) }));
  }

  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-3"><Count label="Pending bags" value={summary.pending} tone="text-zinc-700" /><Count label="Partial bags" value={summary.partial} tone="text-amber-700" /><Count label="Handed to runner" value={summary.handedOver} tone="text-emerald-700" /></div>
    <div className="grid gap-6 lg:grid-cols-[0.85fr_1.4fr]">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><div className="mb-4"><h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Bag queue</h2><p className="mt-1 text-sm text-zinc-500">Select a bag to pack or hand over.</p></div><div className="space-y-3">{bags.map((item) => <button key={item.id} onClick={() => setSelectedId(item.id)} className={`w-full rounded-xl border p-4 text-left transition ${item.id === selectedId ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30" : "border-zinc-200 hover:border-blue-300 dark:border-zinc-800"}`}><div className="flex items-center justify-between gap-2"><p className="font-semibold text-zinc-900 dark:text-zinc-50">{item.id}</p><BagBadge status={bagStatus(item)} /></div><p className="mt-1 text-sm text-zinc-500">{item.customer}</p><p className="mt-3 text-xs text-zinc-500">Bag: {item.bagNumber || "Not assigned"} · {productProgress(item)}</p></button>)}</div></section>
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:p-6"><div className="flex items-start justify-between gap-3 border-b border-zinc-100 pb-5 dark:border-zinc-800"><div><p className="text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">Bag details</p><h2 className="mt-1 text-xl font-bold text-zinc-900 dark:text-zinc-50">{bag.id}</h2><p className="mt-1 text-sm text-zinc-500">{bag.customer}</p></div><BagBadge status={bagStatus(bag)} /></div>
        <label className="mt-5 block max-w-xs text-sm font-semibold text-zinc-800 dark:text-zinc-200">Assign or scan bag<input value={bag.bagNumber} onChange={(event) => updateBag((current) => ({ ...current, bagNumber: event.target.value }))} placeholder="e.g. B-12" className="mt-2 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5 font-normal text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50" /></label>
        <div className="mt-6"><div className="flex items-center justify-between"><h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Product packing</h3><span className="text-sm text-zinc-500">{productProgress(bag)}</span></div><div className="mt-3 divide-y divide-zinc-100 rounded-xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">{bag.products.map((product) => <div key={product.id} className="flex items-center gap-3 p-4"><button type="button" onClick={() => togglePacked(product.id)} disabled={product.status === "Handed to runner"} aria-label={`Toggle ${product.name} packed`} className={`grid h-5 w-5 place-items-center rounded border text-xs font-bold ${product.status === "Packed" ? "border-blue-600 bg-blue-600 text-white" : product.status === "Handed to runner" ? "border-emerald-600 bg-emerald-600 text-white" : "border-zinc-300 text-transparent"}`}>✓</button><span className={`flex-1 text-sm ${product.status === "Handed to runner" ? "text-zinc-400 line-through" : "text-zinc-800 dark:text-zinc-100"}`}>{product.name}</span><span className="text-xs text-zinc-500">×{product.quantity}</span><ProductBadge status={product.status} /></div>)}</div></div>
        <button onClick={handOverPackedProducts} disabled={!packedProducts.length || !bag.bagNumber.trim()} className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 dark:disabled:bg-zinc-700">Hand over {packedProducts.length ? `${packedProducts.length} packed product${packedProducts.length === 1 ? "" : "s"}` : "packed products"} to runner</button>
        {!bag.bagNumber.trim() && <p className="mt-3 text-center text-xs text-zinc-500">Assign a bag before handing products to the runner.</p>}
      </section>
    </div>
  </div>;
}

function bagStatus(bag: Bag) {
  const statuses = bag.products.map((product) => product.status);
  if (statuses.every((status) => status === "Handed to runner")) return "Handed to runner";
  if (statuses.includes("Handed to runner")) return "Partial Handover";
  if (statuses.every((status) => status === "Packed")) return "Packed";
  if (statuses.includes("Packed")) return "Partially Packed";
  return "Pending";
}

function productProgress(bag: Bag) {
  const packed = bag.products.filter((product) => product.status !== "Pending").length;
  return `${packed}/${bag.products.length} items processed`;
}

function Count({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"><p className="text-sm text-zinc-500">{label}</p><p className={`mt-1 text-2xl font-bold ${tone}`}>{value}</p></div>;
}

function BagBadge({ status }: { status: ReturnType<typeof bagStatus> }) {
  const classes = status === "Pending" ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300" : status === "Partially Packed" ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" : status === "Packed" ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300" : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300";
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${classes}`}>{status}</span>;
}

function ProductBadge({ status }: { status: ProductStatus }) {
  const classes = status === "Pending" ? "text-zinc-500" : status === "Packed" ? "text-blue-700 dark:text-blue-400" : "text-emerald-700 dark:text-emerald-400";
  return <span className={`w-28 text-right text-xs font-semibold ${classes}`}>{status}</span>;
}
