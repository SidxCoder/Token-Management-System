"use client";

import { useState } from "react";
import { createOrder, type NewOrderLine } from "@/app/components/shared/api";

type LineDraft = {
  product_name: string;
  sku_code: string;
  sku_description: string;
  bag_number: string;
};

const emptyLine: LineDraft = {
  product_name: "",
  sku_code: "",
  sku_description: "",
  bag_number: "",
};

// Admin-only manual order entry (create_order permission). Mirrors the Excel
// import rules so a hand-entered order behaves the same as an imported one.
export default function AddOrder() {
  const [orderId, setOrderId] = useState("");
  const [customer, setCustomer] = useState("");
  const [phone, setPhone] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([{ ...emptyLine }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  function addLine() {
    setLines((current) => [...current, { ...emptyLine }]);
  }

  function removeLine(index: number) {
    setLines((current) =>
      current.length === 1 ? current : current.filter((_, i) => i !== index),
    );
  }

  function reset() {
    setOrderId("");
    setCustomer("");
    setPhone("");
    setLines([{ ...emptyLine }]);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const items: NewOrderLine[] = lines
      .filter((l) => l.product_name.trim() !== "")
      .map((l) => ({
        product_name: l.product_name.trim(),
        sku_code: l.sku_code.trim() || undefined,
        sku_description: l.sku_description.trim() || undefined,
        bag_number: l.bag_number.trim() || undefined,
      }));

    if (items.length === 0) {
      setError("Add at least one item with a product name");
      return;
    }

    setBusy(true);
    try {
      const order = await createOrder({
        order_id: orderId.trim(),
        customer_name: customer.trim(),
        phone: phone.trim(),
        items,
      });
      setMessage(`Order ${order.order_id} created with ${order.number_of_items} item${order.number_of_items === 1 ? "" : "s"}.`);
      reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </p>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Order details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Order ID" value={orderId} onChange={setOrderId} placeholder="e.g. ORD-3001" required />
          <Field label="Customer name" value={customer} onChange={setCustomer} placeholder="e.g. Anaya Singh" required />
          <Field label="Phone number" value={phone} onChange={setPhone} placeholder="7–15 digits" required inputMode="numeric" />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Items</h2>
            <p className="mt-1 text-sm text-slate-500">
              At least one product. Bag number is optional — filling every line marks
              the order as packaged.
            </p>
          </div>
          <button
            type="button"
            onClick={addLine}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-blue-600 transition hover:bg-blue-50"
          >
            + Add item
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Item {i + 1}
                </span>
                {lines.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="text-xs font-semibold text-slate-500 transition hover:text-red-600"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field
                  label="Product name"
                  value={line.product_name}
                  onChange={(v) => updateLine(i, { product_name: v })}
                  placeholder="e.g. Wireless Charger"
                />
                <Field
                  label="SKU code"
                  value={line.sku_code}
                  onChange={(v) => updateLine(i, { sku_code: v })}
                  placeholder="Optional"
                />
                <Field
                  label="SKU description"
                  value={line.sku_description}
                  onChange={(v) => updateLine(i, { sku_description: v })}
                  placeholder="Optional"
                />
                <Field
                  label="Bag number"
                  value={line.bag_number}
                  onChange={(v) => updateLine(i, { bag_number: v })}
                  placeholder="Optional"
                  inputMode="numeric"
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:px-8"
      >
        {busy ? "Creating…" : "Create order"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  inputMode?: "numeric" | "text";
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        required={required}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
