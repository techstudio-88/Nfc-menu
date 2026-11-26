/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useRef, useState } from "react";
import { api, useRealtime } from "@/lib/client";
import type { OrderView } from "@/lib/orders";
import { AlertBar, OrderCard } from "@/components/OrderCard";
import { Button, Card, Empty, ErrorState, Loading, PageHeader, useAsync, useToast } from "@/components/ui";

type R = { orders: OrderView[]; employees: { id: string; name: string; title: string }[]; role: string };

export default function OrdersPage() {
  const toast = useToast();
  const [view, setView] = useState<"active" | "history">("active");
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const o = useAsync<R>(() => api<R>(`/api/orders?view=${view}`), [view]);
  const as = useAsync<{ rows: any[] }>(() => api("/api/assist"), []);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rt = useRealtime({
    scope: "owner",
    onEvents: (e) => {
      const ids = e.filter((x) => x.type === "order_new" && x.orderId).map((x) => x.orderId!);
      if (ids.length) {
        setFresh((s) => new Set([...s, ...ids]));
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setFresh(new Set()), 20000);
      }
      e.forEach((x) => toast(x.title, "info"));
      void o.reload(true);
      void as.reload(true);
    },
  });
  const resolve = async (id: string) => {
    await api("/api/assist", { body: { id } });
    void as.reload(true);
  };

  return (
    <div>
      <PageHeader
        title="Live orders"
        sub="Orders arrive here in real time — no refresh needed."
        actions={
          <div className="flex gap-1">
            <Button variant={view === "active" ? "primary" : "subtle"} onClick={() => setView("active")}>
              Active
            </Button>
            <Button variant={view === "history" ? "primary" : "subtle"} onClick={() => setView("history")}>
              History
            </Button>
          </div>
        }
      />
      <AlertBar rt={rt} />
      {as.data && as.data.rows.length > 0 && (
        <Card className="mb-4 !border-amber-500/40 !bg-amber-500/5">
          <p className="mb-2 text-sm font-medium text-amber-200">🛎 Customer requests</p>
          <ul className="space-y-1.5">
            {as.data.rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between rounded-lg bg-black/30 px-3 py-2 text-sm">
                <span>
                  Table <b>{r.tableCode}</b> — {r.kind === "bill" ? "wants the bill" : r.kind === "water" ? "needs water" : "needs assistance"}
                </span>
                <Button size="sm" onClick={() => resolve(r.id)}>
                  Resolve
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {o.loading && !o.data ? (
        <Loading />
      ) : o.error || !o.data ? (
        <ErrorState message={o.error ?? "Failed"} retry={o.reload} />
      ) : o.data.orders.length === 0 ? (
        <Empty icon="🧾" title={view === "active" ? "No active orders" : "No past orders yet"} text={view === "active" ? "When a guest orders from an NFC card, it lands here with a sound alert." : "Completed and cancelled orders will be listed here."} />
      ) : (
        <div className="grid gap-4 2xl:grid-cols-2">
          {o.data.orders.map((x) => (
            <OrderCard key={x.id} order={x} role={o.data!.role} employees={o.data!.employees} onChange={() => o.reload(true)} highlight={fresh.has(x.id)} />
          ))}
        </div>
      )}
    </div>
  );
}
