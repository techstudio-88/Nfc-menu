/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import Link from "next/link";
import { useState } from "react";
import { api, useRealtime, type RtEvent } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import { AlertBar } from "@/components/OrderCard";
import { Button, Card, ErrorState, Loading, PageHeader, Stat, useAsync, useToast } from "@/components/ui";

type A = { currency: string; days: number; today: { orders: number; revenue: number; pending: number; completed: number; avgOrder: number; paid: number }; range: { orders: number; revenue: number; avgOrder: number }; trend: { day: string; revenue: number; count: number }[]; popular: { name: string; qty: number; revenue: number }[] };

export default function Overview() {
  const toast = useToast();
  const [days, setDays] = useState(7);
  const [feed, setFeed] = useState<RtEvent[]>([]);
  const a = useAsync<A>(() => api<A>(`/api/owner/analytics?days=${days}`), [days]);
  const s = useAsync<any>(() => api("/api/owner/settings"), []);
  const rt = useRealtime({
    scope: "owner",
    onEvents: (e) => {
      setFeed((f) => [...e.reverse(), ...f].slice(0, 12));
      e.forEach((x) => toast(x.title, "info"));
      void a.reload(true);
    },
  });
  if (a.loading && !a.data) return <Loading />;
  if (a.error || !a.data) return <ErrorState message={a.error ?? "Failed"} retry={a.reload} />;
  const d = a.data;
  const cur = d.currency;

  // fill missing days for the chart
  const map = new Map(d.trend.map((t) => [t.day, t]));
  const series = Array.from({ length: d.days }, (_, i) => {
    const dt = new Date(Date.now() - (d.days - 1 - i) * 864e5);
    const key = dt.toISOString().slice(0, 10);
    return { key, label: dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }), revenue: map.get(key)?.revenue ?? 0, count: map.get(key)?.count ?? 0 };
  });
  const max = Math.max(1, ...series.map((x) => x.revenue));
  const u = s.data?.usage;
  const checklist = u
    ? [
        { done: !!s.data.restaurant.logoAssetId, label: "Upload your logo & pick brand colours", href: "/dashboard/settings" },
        { done: u.items > 0, label: "Build your menu", href: "/dashboard/menu" },
        { done: u.tables > 0, label: "Add tables & generate NFC cards", href: "/dashboard/venues" },
        { done: u.employees > 1, label: "Invite kitchen & floor staff", href: "/dashboard/team" },
        { done: d.range.orders > 0, label: "Receive your first order", href: `/r/${s.data.restaurant.slug}` },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Overview"
        sub={`${s.data?.restaurant.name ?? ""} · today at a glance`}
        actions={
          <>
            {s.data && (
              <Link href={`/r/${s.data.restaurant.slug}`} target="_blank">
                <Button>Open customer menu ↗</Button>
              </Link>
            )}
            <Link href="/dashboard/orders">
              <Button variant="primary">Live orders</Button>
            </Link>
          </>
        }
      />
      <AlertBar rt={rt} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Today’s orders" value={d.today.orders} accent />
        <Stat label="Revenue today" value={formatMoney(d.today.revenue, cur)} sub={`${formatMoney(d.today.paid, cur)} collected`} />
        <Stat label="Pending" value={d.today.pending} sub="in progress right now" />
        <Stat label="Completed" value={d.today.completed} />
        <Stat label="Avg. order value" value={formatMoney(d.today.avgOrder, cur)} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-display text-2xl text-white">Sales trend</h2>
              <p className="text-xs text-neutral-500">
                {formatMoney(d.range.revenue, cur)} · {d.range.orders} orders in {d.days} days
              </p>
            </div>
            <div className="flex gap-1">
              {[7, 14, 30].map((n) => (
                <Button key={n} size="sm" variant={days === n ? "primary" : "subtle"} onClick={() => setDays(n)}>
                  {n}d
                </Button>
              ))}
            </div>
          </div>
          {d.range.orders === 0 ? (
            <p className="py-16 text-center text-sm text-neutral-500">No sales in this period yet. Orders placed from your NFC menu will appear here instantly.</p>
          ) : (
            <div className="flex h-56 items-end gap-1.5" role="img" aria-label="Daily revenue bar chart">
              {series.map((p) => (
                <div key={p.key} className="group relative flex h-full flex-1 flex-col justify-end">
                  <div className="rounded-t-md bg-gradient-to-t from-orange-600 to-amber-300 transition-all group-hover:brightness-125" style={{ height: `${Math.max(2, (p.revenue / max) * 100)}%` }} />
                  <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-black px-2 py-1 text-xs group-hover:block">
                    {formatMoney(p.revenue, cur)} · {p.count}
                  </span>
                  {d.days <= 14 && <span className="mt-1.5 text-center text-[10px] text-neutral-500">{p.label}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h2 className="font-display text-2xl text-white">Popular dishes</h2>
          {d.popular.length === 0 ? (
            <p className="py-10 text-center text-sm text-neutral-500">Nothing ordered yet.</p>
          ) : (
            <ol className="mt-4 space-y-3">
              {d.popular.map((p, i) => (
                <li key={p.name}>
                  <div className="flex justify-between text-sm">
                    <span className="truncate text-neutral-200">
                      <span className="mr-2 text-neutral-500">{i + 1}</span>
                      {p.name}
                    </span>
                    <span className="text-neutral-400">{p.qty}×</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: `${(p.qty / d.popular[0].qty) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {checklist.some((c) => !c.done) && (
          <Card>
            <h2 className="font-display text-2xl text-white">Get launch-ready</h2>
            <ul className="mt-3 space-y-2">
              {checklist.map((c) => (
                <li key={c.label}>
                  <Link href={c.href} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm hover:bg-white/5">
                    <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${c.done ? "bg-emerald-500 text-black" : "border border-white/20"}`}>{c.done ? "✓" : ""}</span>
                    <span className={c.done ? "text-neutral-500 line-through" : "text-neutral-200"}>{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <h2 className="font-display text-2xl text-white">Live activity</h2>
          {feed.length === 0 ? <p className="py-8 text-center text-sm text-neutral-500">New orders and requests appear here the moment they happen.</p> : (
            <ul className="mt-3 space-y-2">
              {feed.map((e) => (
                <li key={e.id} className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2 text-sm">
                  <span>{e.type === "assist" ? "🛎" : e.type === "order_ready" ? "✨" : "🔔"}</span>
                  <span className="text-neutral-200">{e.title}<span className="block text-xs text-neutral-500">{e.body}</span></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
