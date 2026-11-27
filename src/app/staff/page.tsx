/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { api, useRealtime, type RtEvent } from "@/lib/client";
import type { OrderView } from "@/lib/orders";
import { AlertBar, OrderCard } from "@/components/OrderCard";
import { Button, Card, Empty, ErrorState, Loading, PageHeader, Toggle, useAsync, useToast } from "@/components/ui";

type R = { orders: OrderView[]; employees: { id: string; name: string; title: string }[]; me: { id: string; onDuty: boolean } | null; role: string };

export default function Staff() {
  const toast = useToast();
  const [tab, setTab] = useState<"live" | "mine" | "requests" | "history">("live");
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [feed, setFeed] = useState<RtEvent[]>([]);
  const active = useAsync<R>(() => api<R>("/api/orders?view=active"), []);
  const hist = useAsync<R>(() => api<R>(`/api/orders?view=history&days=7${active.data?.me ? "&mine=1" : ""}`), [tab === "history"]);
  const req = useAsync<{ rows: any[] }>(() => api("/api/assist"), []);
  const me = active.data?.me;

  const rt = useRealtime({
    scope: me ? "staff" : "owner",
    enabled: !!active.data,
    onEvents: (e) => {
      setFeed((f) => [...e.reverse(), ...f].slice(0, 6));
      const ids = e.filter((x) => x.orderId && ["order_new", "order_ready", "order_assigned"].includes(x.type)).map((x) => x.orderId!);
      if (ids.length) {
        setFresh((s) => new Set([...s, ...ids]));
        setTimeout(() => setFresh(new Set()), 25000);
      }
      e.forEach((x) => toast(x.title, "info"));
      void active.reload(true);
      void req.reload(true);
    },
  });

  const duty = async (v: boolean) => {
    try {
      await api("/api/staff", { method: "PATCH", body: { onDuty: v } });
      active.reload(true);
      toast(v ? "You’re on duty — alerts enabled" : "Off duty — no new-order alerts");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
    }
  };
  const resolve = async (id: string) => {
    await api("/api/assist", { body: { id } });
    req.reload(true);
  };

  if (active.loading && !active.data) return <Loading />;
  if (active.error || !active.data) return <ErrorState message={active.error ?? "Failed"} retry={active.reload} />;
  const d = active.data;
  const live = d.orders.filter((o) => ["placed", "accepted", "preparing", "ready", "served"].includes(o.status));
  const mine = live.filter((o) => o.assignedEmployeeId === me?.id);
  const ready = live.filter((o) => o.status === "ready").length;
  const list = tab === "mine" ? mine : live;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Floor panel"
        sub={ready ? `${ready} order${ready > 1 ? "s" : ""} ready to serve` : "Orders, assignments and table requests"}
        actions={me && (
          <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-neutral-300">
            <Toggle checked={me.onDuty} onChange={duty} label="On duty" /> On duty
          </label>
        )}
      />
      <AlertBar rt={rt} />
      {feed.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {feed.slice(0, 3).map((e) => (
            <div key={e.id} className="flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              <span>{e.type === "assist" ? "🛎" : e.type === "order_ready" ? "✨" : "🔔"}</span> {e.title}
            </div>
          ))}
        </div>
      )}
      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto">
        {([["live", `All active (${live.length})`], ["mine", `Mine (${mine.length})`], ["requests", `Requests (${req.data?.rows.length ?? 0})`], ["history", "History"]] as const).map(([k, l]) => (
          <Button key={k} variant={tab === k ? "primary" : "subtle"} onClick={() => setTab(k)}>{l}</Button>
        ))}
      </div>

      {tab === "requests" ? (
        (req.data?.rows.length ?? 0) === 0 ? <Empty icon="🛎" title="No open requests" text="When a guest taps “Call waiter” on their phone, it shows here with an alert." /> : (
          <div className="space-y-2">
            {req.data!.rows.map((r) => (
              <Card key={r.id} className="flex items-center justify-between !p-4">
                <div className="min-w-0"><p className="text-white">Table <b className="text-emerald-700">{r.tableCode}</b> <span className="text-neutral-500">— {r.kind === "payment" ? "ready to pay" : r.kind === "bill" ? "requested the bill" : r.kind === "water" ? "needs water" : r.kind === "waiter" ? "called a waiter" : "needs assistance"}</span></p>{r.message && <p className="mt-1 text-xs text-neutral-500">{r.message}</p>}</div>
                <Button variant="success" onClick={() => resolve(r.id)}>Done</Button>
              </Card>
            ))}
          </div>
        )
      ) : tab === "history" ? (
        hist.loading && !hist.data ? <Loading /> : (hist.data?.orders.length ?? 0) === 0 ? <Empty icon="🗂" title="No completed orders in the last 7 days" /> : (
          <div className="space-y-3">{hist.data!.orders.map((o) => <OrderCard key={o.id} order={o} role={d.role} meEmployeeId={me?.id} onChange={() => hist.reload(true)} />)}</div>
        )
      ) : list.length === 0 ? (
        <Empty icon="🍽" title={tab === "mine" ? "Nothing assigned to you" : "No active orders"} text={tab === "mine" ? "Open “All active” and tap “Take this order”." : "New orders appear instantly with a sound alert."} />
      ) : (
        <div className="space-y-3">
          {[...list].sort((a, b) => Number(b.status === "ready") - Number(a.status === "ready")).map((o) => (
            <OrderCard key={o.id} order={o} role={d.role} employees={d.employees} meEmployeeId={me?.id} onChange={() => active.reload(true)} highlight={fresh.has(o.id) || o.status === "ready"} />
          ))}
        </div>
      )}
    </div>
  );
}
