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
  tableRevenue: { tableCode: string; orders: number; revenue: number }[];
  peakHours: { hour: number; orders: number; revenue: number }[];
  branchComparison: { branchId: string | null; branchName: string; orders: number; revenue: number }[];
  repeatCustomers: { customers: number; orders: number };
  costs: { foodCost: number; sales: number; grossProfit: number; marginPercent: number; configured: boolean };
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
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Food cost" value={formatMoney(d.costs.foodCost, d.currency)} sub={d.costs.configured ? "Recipe-based ingredient cost" : "Add recipes to inventory items"} />
        <Stat label="Gross profit" value={formatMoney(d.costs.grossProfit, d.currency)} sub="Sales less configured food cost" />
        <Stat label="Gross margin" value={d.costs.configured ? `${d.costs.marginPercent}%` : "—"} sub="Before labour, rent and overheads" />
        <Stat label="Repeat customers" value={d.repeatCustomers.customers} sub={`${d.repeatCustomers.orders} orders from repeat visitors`} />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-2xl text-ink">Revenue by table</h2>
          <div className="mt-3 space-y-2">{d.tableRevenue.length ? d.tableRevenue.map((x) => <div key={x.tableCode} className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-ink">{x.tableCode || "Unassigned"}</span><span className="text-mute">{x.orders} orders</span><span className="font-semibold text-ink">{formatMoney(x.revenue,d.currency)}</span></div>) : <p className="text-sm text-mute">No table revenue yet.</p>}</div>
          <Button size="sm" variant="subtle" className="mt-3" onClick={() => csv(`tables-${days}d.csv`, [["Table","Orders","Revenue"], ...d.tableRevenue.map((x) => [x.tableCode,x.orders,(x.revenue/100).toFixed(2)])])}>Export table report</Button>
        </Card>
        <Card>
          <h2 className="font-display text-2xl text-ink">Peak hours</h2>
          <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">{Array.from({length:24},(_,hour)=>{const row=d.peakHours.find(x=>x.hour===hour);const max=Math.max(1,...d.peakHours.map(x=>x.orders));return <div key={hour} className="text-center"><div className="flex h-20 items-end justify-center rounded-lg bg-porcelain p-1"><span className="w-full rounded-md bg-brand" style={{height:`${Math.max(4,((row?.orders??0)/max)*100)}%`}} /></div><p className="mt-1 text-[10px] text-mute">{String(hour).padStart(2,"0")}:00</p><p className="text-xs font-semibold text-ink">{row?.orders??0}</p></div>})}</div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl text-ink">Branch comparison</h2>
          <div className="mt-3 space-y-3">{d.branchComparison.length ? d.branchComparison.map((x) => <div key={x.branchId ?? "none"} className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-ink">{x.branchName}</span><span className="text-mute">{x.orders} orders</span><span className="font-semibold text-ink">{formatMoney(x.revenue,d.currency)}</span></div>) : <p className="text-sm text-mute">No branch activity yet.</p>}</div>
        </Card>
        <Card>
          <h2 className="font-display text-2xl text-ink">Food cost & margins</h2>
          <p className="mt-2 text-sm text-mute">{d.costs.configured ? "Recipe costs are snapshotted when each order is placed." : "Set ingredient recipes to unlock reliable food-cost and gross-margin reporting."}</p>
          <p className="mt-3 font-display text-3xl text-ink">{d.costs.configured ? `${d.costs.marginPercent}%` : "Not configured"}</p>
          <a href="/dashboard/costing" className="mt-3 inline-flex text-sm font-semibold text-brand underline-offset-4 hover:underline">Manage dish recipes ↗</a>
        </Card>
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
