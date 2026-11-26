/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import { Badge, Button, Card, Empty, ErrorState, Loading, PageHeader, Stat, useAsync } from "@/components/ui";

type A = {
  currency: string;
  days: number;
  range: { orders: number; revenue: number; avgOrder: number; tax: number; discount: number; service: number };
  popular: { name: string; qty: number; revenue: number }[];
  byMethod: { method: string; status: string; amount: number; n: number }[];
  payments: { id: string; orderNo: number; tableCode: string; method: string; provider: string; amount: number; currency: string; status: string; createdAt: string; paidAt: string | null }[];
};

const csv = (name: string, rows: (string | number)[][]) => {
  const body = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([body], { type: "text/csv" }));
  a.download = name;
  a.click();
};

export default function Reports() {
  const [days, setDays] = useState(30);
  const a = useAsync<A>(() => api<A>(`/api/owner/analytics?days=${days}`), [days]);
  if (a.loading && !a.data) return <Loading />;
  if (a.error || !a.data) return <ErrorState message={a.error ?? "Failed"} retry={a.reload} />;
  const d = a.data;
  const paid = d.byMethod.filter((m) => m.status === "paid").reduce((s, m) => s + m.amount, 0);
  const pending = d.byMethod.filter((m) => m.status === "pending").reduce((s, m) => s + m.amount, 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        sub="Sales, taxes and payment records."
        actions={
          <>
            {[7, 30, 90].map((n) => <Button key={n} variant={days === n ? "primary" : "subtle"} onClick={() => setDays(n)}>{n} days</Button>)}
            <Button onClick={() => csv(`payments-${days}d.csv`, [["Order", "Table", "Method", "Provider", "Amount", "Currency", "Status", "Created", "Paid"], ...d.payments.map((p) => [p.orderNo, p.tableCode, p.method, p.provider, (p.amount / 100).toFixed(2), p.currency, p.status, p.createdAt, p.paidAt ?? ""])])} disabled={!d.payments.length}>⬇ Export CSV</Button>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Orders" value={d.range.orders} accent />
        <Stat label="Gross sales" value={formatMoney(d.range.revenue, d.currency)} sub={`avg ${formatMoney(d.range.avgOrder, d.currency)}`} />
        <Stat label="Collected" value={formatMoney(paid, d.currency)} sub={`${formatMoney(pending, d.currency)} outstanding`} />
        <Stat label="Tax / service / discounts" value={formatMoney(d.range.tax, d.currency)} sub={`service ${formatMoney(d.range.service, d.currency)} · discounts ${formatMoney(d.range.discount, d.currency)}`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-6">
          <Card>
            <h2 className="font-display text-2xl text-white">By payment method</h2>
            {d.byMethod.length === 0 ? <p className="py-6 text-sm text-neutral-500">No payments recorded yet.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {d.byMethod.map((m) => (
                  <li key={m.method + m.status} className="flex items-center justify-between">
                    <span className="capitalize text-neutral-300">{m.method.replace(/_/g, " ")} <Badge tone={m.status === "paid" ? "green" : m.status === "pending" ? "amber" : "red"}>{m.status}</Badge></span>
                    <span className="tabular-nums text-neutral-200">{formatMoney(m.amount, d.currency)} <span className="text-neutral-500">· {m.n}</span></span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <div className="flex items-center justify-between"><h2 className="font-display text-2xl text-white">Top dishes</h2>
              <Button size="sm" onClick={() => csv(`dishes-${days}d.csv`, [["Dish", "Qty", "Revenue"], ...d.popular.map((p) => [p.name, p.qty, (p.revenue / 100).toFixed(2)])])} disabled={!d.popular.length}>CSV</Button></div>
            {d.popular.length === 0 ? <p className="py-6 text-sm text-neutral-500">No sales yet.</p> : (
              <ul className="mt-3 space-y-2 text-sm">
                {d.popular.map((p) => <li key={p.name} className="flex justify-between"><span className="truncate text-neutral-300">{p.name}</span><span className="tabular-nums text-neutral-400">{p.qty}× · {formatMoney(p.revenue, d.currency)}</span></li>)}
              </ul>
            )}
          </Card>
        </div>
        <Card className="overflow-x-auto">
          <h2 className="font-display text-2xl text-white">Payment records</h2>
          {d.payments.length === 0 ? <Empty icon="💳" title="No payments yet" text="Every order creates a payment record that’s settled when paid." /> : (
            <table className="mt-3 w-full min-w-[560px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-neutral-500"><tr><th className="py-2">Order</th><th>Table</th><th>Method</th><th>Status</th><th className="text-right">Amount</th><th className="text-right">When</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {d.payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 font-medium text-white">#{p.orderNo}</td><td>{p.tableCode}</td>
                    <td className="capitalize text-neutral-300">{p.method.replace(/_/g, " ")}</td>
                    <td><Badge tone={p.status === "paid" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status}</Badge></td>
                    <td className="text-right tabular-nums">{formatMoney(p.amount, p.currency)}</td>
                    <td className="text-right text-xs text-neutral-500">{new Date(p.paidAt ?? p.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}
