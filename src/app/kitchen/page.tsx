"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { api, clock, minutesSince, useNow, useRealtime } from "@/lib/client";
import type { OrderView } from "@/lib/orders";
import { AlertBar, Customizations, VoicePanel } from "@/components/OrderCard";
import { Button, cx, Loading, useAsync, useToast } from "@/components/ui";

type R = { orders: OrderView[]; stations: { id: string; name: string }[]; me: { stationId: string | null } | null; role: string; restaurantName: string };

export default function Kitchen() {
  const toast = useToast();
  const now = useNow(1000);
  const [station, setStation] = useState<string>("all");
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const init = useRef(false);
  const o = useAsync<R>(() => api<R>("/api/orders?view=active"), []);
  const rt = useRealtime({
    scope: "kitchen",
    station: station === "all" ? null : station,
    onEvents: (e) => {
      const ids = e.filter((x) => x.type === "order_new" && x.orderId).map((x) => x.orderId!);
      if (ids.length) {
        setFresh((s) => new Set([...s, ...ids]));
        setTimeout(() => setFresh((s) => new Set([...s].filter((i) => !ids.includes(i)))), 30000);
      }
      void o.reload(true);
    },
  });
  useEffect(() => {
    const i = setInterval(() => o.reload(true), 20000); // safety net alongside the event feed
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (o.data && !init.current) {
      init.current = true;
      if (o.data.me?.stationId) setStation(o.data.me.stationId);
    }
  }, [o.data]);

  const cards = useMemo(() => {
    if (!o.data) return [];
    const list = o.data.orders
      .filter((x) => ["placed", "accepted", "preparing", "ready"].includes(x.status))
      .map((x) => {
        const items = station === "all" ? x.items : x.items.filter((i) => i.stationId === station);
        const st = station === "all" ? null : x.stations.find((s) => s.stationId === station);
        return { order: x, items, st };
      })
      .filter((c) => c.items.length > 0);
    return list.sort((a, b) => Number(b.order.priority) - Number(a.order.priority) || +new Date(a.order.createdAt) - +new Date(b.order.createdAt));
  }, [o.data, station]);

  const colOf = (c: (typeof cards)[number]) => {
    const s = c.st?.status ?? c.order.status;
    return s === "placed" ? 0 : s === "accepted" || s === "preparing" ? 1 : 2;
  };
  const cols = [
    { title: "New", tone: "border-amber-400/40", cards: cards.filter((c) => colOf(c) === 0) },
    { title: "In progress", tone: "border-violet-400/40", cards: cards.filter((c) => colOf(c) === 1) },
    { title: "Ready", tone: "border-emerald-400/40", cards: cards.filter((c) => colOf(c) === 2) },
  ];

  const act = async (orderId: string, body: Record<string, unknown>) => {
    try {
      await api(`/api/orders/${orderId}`, { body });
      void o.reload(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
    }
  };

  if (o.loading && !o.data) return <Loading label="Opening kitchen…" />;

  return (
    <div className="min-h-dvh bg-[#080808] p-3 sm:p-5">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <p className="font-display text-3xl text-white">Kitchen <span className="gold-text">display</span></p>
          <p className="text-xs text-neutral-500">{o.data?.restaurantName}</p>
        </div>
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          {[{ id: "all", name: "All stations" }, ...(o.data?.stations ?? [])].map((s) => (
            <button key={s.id} onClick={() => setStation(s.id)} aria-pressed={station === s.id} className={cx("shrink-0 rounded-full border px-5 py-2.5 text-base font-medium", station === s.id ? "border-amber-400 bg-amber-500/20 text-amber-200" : "border-white/10 text-neutral-400")}>
              {s.name}
            </button>
          ))}
        </div>
        <span className={cx("rounded-full px-3 py-1 text-xs", rt.connected ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/20 text-red-300")}>{rt.connected ? "● live" : "● reconnecting"}</span>
        <Button size="sm" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>⛶</Button>
        {["owner", "manager"].includes(o.data?.role ?? "") && <Link href="/dashboard"><Button size="sm">Dashboard</Button></Link>}
        <Button size="sm" variant="ghost" onClick={async () => { await api("/api/auth/logout", { body: {} }); location.href = "/login"; }}>Sign out</Button>
      </header>
      <AlertBar rt={rt} />
      {cards.length === 0 ? (
        <div className="grid h-[60vh] place-items-center text-center">
          <div>
            <p className="text-6xl">🍳</p>
            <p className="font-display mt-4 text-3xl text-white">All caught up</p>
            <p className="mt-1 text-neutral-500">New orders pop up here instantly with a sound alert.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {cols.map((col) => (
            <section key={col.title} aria-label={col.title}>
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold uppercase tracking-[0.2em] text-neutral-400">
                {col.title}
                <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white">{col.cards.length}</span>
              </h2>
              <div className="space-y-3">
                {col.cards.map(({ order, items, st }) => (
                  <KCard key={order.id} order={order} items={items} stStatus={st?.status} stationId={station === "all" ? null : station} now={now} border={col.tone} fresh={fresh.has(order.id)} act={act} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function KCard({ order, items, stStatus, stationId, now, border, fresh, act }: { order: OrderView; items: OrderView["items"]; stStatus?: string; stationId: string | null; now: number; border: string; fresh: boolean; act: (id: string, b: Record<string, unknown>) => void; }) {
  const [voice, setVoice] = useState(false);
  const mins = minutesSince(order.createdAt, now);
  const late = mins >= 20 ? "text-red-400" : mins >= 10 ? "text-amber-300" : "text-emerald-300";
  const status = stStatus ?? order.status;
  const next: { label: string; run: () => void; cls: string } | null =
    status === "placed"
      ? { label: "Accept order", cls: "bg-amber-400 text-black", run: () => (stationId ? act(order.id, { action: "station", stationId, to: "accepted" }) : act(order.id, { action: "status", to: "accepted" })) }
      : status === "accepted"
        ? { label: "Start preparation", cls: "bg-violet-400 text-black", run: () => (stationId ? act(order.id, { action: "station", stationId, to: "preparing" }) : act(order.id, { action: "status", to: "preparing" })) }
        : status === "preparing"
          ? { label: "Mark ready", cls: "bg-emerald-400 text-black", run: () => (stationId ? act(order.id, { action: "station", stationId, to: "ready" }) : act(order.id, { action: "status", to: "ready" })) }
          : status === "ready" || status === "completed"
            ? order.status === "ready"
              ? { label: "Complete", cls: "bg-white/15 text-white", run: () => act(order.id, { action: "status", to: "completed" }) }
              : null
            : null;
  return (
    <article className={cx("rounded-2xl border-2 bg-neutral-900 p-4 transition", border, fresh && "animate-pulse ring-2 ring-amber-300")}>
      <header className="flex items-center gap-3">
        <span className="font-display text-4xl text-white">#{order.orderNo}</span>
        <span className="rounded-lg bg-amber-500/20 px-3 py-1 text-xl font-bold text-amber-300">T {order.tableCode}</span>
        {order.priority && <span className="rounded-md bg-red-500 px-2 py-0.5 text-xs font-bold uppercase text-white">Priority</span>}
        <span className={cx("ml-auto font-mono text-2xl font-semibold tabular-nums", late)} aria-label={`${mins} minutes`}>{clock(order.createdAt, now)}</span>
      </header>
      <ul className="mt-3 space-y-3">
        {items.map((it) => (
          <li key={it.id} className="border-t border-white/10 pt-3">
            <p className="text-xl font-semibold text-white">
              <span className="mr-2 inline-block min-w-10 rounded-lg bg-white/10 px-2 py-0.5 text-center text-amber-300">{it.quantity}×</span>
              {it.name}
              {it.variantName && <span className="ml-2 rounded bg-amber-500/20 px-2 py-0.5 text-base text-amber-200">{it.variantName}</span>}
            </p>
            <Customizations it={it} big />
            {it.instructions && <p className="mt-2 rounded-lg bg-amber-400/15 px-3 py-1.5 text-base font-medium text-amber-200">⚠ {it.instructions}</p>}
            {!stationId && <p className="mt-1 text-xs text-neutral-500">{it.stationName}</p>}
          </li>
        ))}
      </ul>
      {order.notes && <p className="mt-3 rounded-lg bg-amber-400/15 px-3 py-2 text-base text-amber-100">Note: {order.notes}</p>}
      {order.stations.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {order.stations.map((s) => (
            <span key={s.stationId} className={cx("rounded-full px-2.5 py-1", s.status === "ready" || s.status === "completed" ? "bg-emerald-500/20 text-emerald-300" : s.status === "preparing" ? "bg-violet-500/20 text-violet-300" : "bg-white/10 text-neutral-300")}>
              {s.stationName}: {s.status === "completed" ? "ready" : s.status}
            </span>
          ))}
        </div>
      )}
      <footer className="mt-4 flex gap-2">
        {next && (
          <button onClick={next.run} className={cx("flex-1 rounded-xl py-4 text-lg font-bold transition active:scale-[0.98]", next.cls)}>
            {next.label}
          </button>
        )}
        <button onClick={() => act(order.id, { action: "priority", value: !order.priority })} aria-pressed={order.priority} aria-label="Toggle priority" className={cx("rounded-xl border px-4 text-lg", order.priority ? "border-red-400 bg-red-500/20" : "border-white/10")}>⚑</button>
        <button onClick={() => setVoice((v) => !v)} aria-label="Voice tools" className="rounded-xl border border-white/10 px-4 text-lg">🔊</button>
      </footer>
      {voice && <VoicePanel order={order} />}
    </article>
  );
}
