"use client";

import { useEffect, useState } from "react";
import UserManagement from "./UserManagement";

type Reports = {
  byStatus: Record<string, number>;
  tokens: { issuedToday: number; cancelledToday: number };
  deliveredToday: number;
};

export default function AdminDashboard() {
  const [reports, setReports] = useState<Reports | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/admin/reports");
      if (!res.ok) return;
      const data = (await res.json()) as Reports;
      setReports(data);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat
          label="Tokens issued today"
          value={reports?.tokens.issuedToday ?? "—"}
        />
        <Stat
          label="Delivered today"
          value={reports?.deliveredToday ?? "—"}
        />
        <Stat
          label="Cancelled today"
          value={reports?.tokens.cancelledToday ?? "—"}
        />
      </div>
      <UserManagement />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-zinc-900">{value}</p>
    </div>
  );
}
