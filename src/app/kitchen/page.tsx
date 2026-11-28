"use client";
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
    { title: "New", tone: "border-t-signal", dot: "bg-signal", cards: cards.filter((c) => colOf(c) === 0) },
    { title: "In progress", tone: "border-t-warn", dot: "bg-warn", cards: cards.filter((c) => colOf(c) === 1) },
    { title: "Ready", tone: "border-t-ok", dot: "bg-ok", cards: cards.filter((c) => colOf(c) === 2) },
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
    <div>
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <p className="font-display text-3xl text-ink">Kitchen <span className="gold-text">display</span></p>
          <p className="text-xs text-mute">{o.data?.restaurantName}</p>
        </div>
        <div className="no-scrollbar flex flex-1 gap-1.5 overflow-x-auto">
          {[{ id: "all", name: "All stations" }, ...(o.data?.stations ?? [])].map((s) => (
            <button key={s.id} onClick={() => setStation(s.id)} aria-pressed={station === s.id} className={cx("shrink-0 rounded-full border px-5 py-2.5 text-base font-medium", station === s.id ? "border-brand bg-brand text-[#ffffff]" : "border-line bg-surface text-mute hover:border-brand/40")}>
              {s.name}
            </button>
          ))}
        </div>
        <span className={cx("rounded-full px-3 py-1 text-xs", rt.connected ? "bg-ok-soft text-ok" : "bg-signal-soft text-signal")}>{rt.connected ? "● live" : "● reconnecting"}</span>
        <Button size="sm" onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.())}>⛶</Button>
      </header>
      <AlertBar rt={rt} />
      {cards.length === 0 ? (
        <div className="grid h-[60vh] place-items-center text-center">
          <div>
            <p className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-brand-soft text-4xl text-brand">✓</p>
            <p className="font-display mt-4 text-3xl text-ink">All caught up</p>
            <p className="mt-1 text-mute">New orders pop up here instantly with a sound alert.</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {cols.map((col) => (
            <section key={col.title} aria-label={col.title}>
              <h2 className="mb-3 flex items-center justify-between px-1 text-sm font-semibold uppercase tracking-[0.2em] text-mute">
                <span className="flex items-center gap-2"><span className={cx("h-2 w-2 rounded-full", col.dot)} />{col.title}</span>
                <span className="rounded-full bg-brand-soft px-2.5 py-0.5 text-xs text-brand-deep">{col.cards.length}</span>
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
  const late = mins >= 20 ? "animate-pulse text-signal" : mins >= 10 ? "text-warn" : "text-ok";
  const status = stStatus ?? order.status;
  const next: { label: string; run: () => void; cls: string } | null =
    status === "placed"
      ? { label: "Accept order", cls: "bg-signal text-[#ffffff]", run: () => (stationId ? act(order.id, { action: "station", stationId, to: "accepted" }) : act(order.id, { action: "status", to: "accepted" })) }
      : status === "accepted"
        ? { label: "Start preparation", cls: "bg-warn text-[#ffffff]", run: () => (stationId ? act(order.id, { action: "station", stationId, to: "preparing" }) : act(order.id, { action: "status", to: "preparing" })) }
        : status === "preparing"
          ? { label: "Mark ready", cls: "bg-ok text-[#ffffff]", run: () => (stationId ? act(order.id, { action: "station", stationId, to: "ready" }) : act(order.id, { action: "status", to: "ready" })) }
          : status === "ready" || status === "completed"
            ? order.status === "ready"
              ? { label: "Complete", cls: "bg-ink text-[#ffffff]", run: () => act(order.id, { action: "status", to: "completed" }) }
              : null
            : null;
  return (
    <article className={cx("tm-card rounded-2xl border border-t-4 p-4", border, fresh && "animate-pulse ring-2 ring-signal")}>
      <header className="flex items-center gap-3">
        <span className="font-display text-4xl text-ink">#{order.orderNo}</span>
        <span className="rounded-lg bg-brand-soft px-3 py-1 text-xl font-bold text-brand-deep">T {order.tableCode}</span>
        {order.priority && <span className="rounded-md bg-signal px-2 py-0.5 text-xs font-bold uppercase text-[#ffffff]">Priority</span>}
        <span className={cx("ml-auto font-mono text-2xl font-semibold tabular-nums", late)} aria-label={`${mins} minutes`}>{clock(order.createdAt, now)}</span>
      </header>
      <ul className="mt-3 space-y-3">
        {items.map((it) => (
          <li key={it.id} className="border-t border-line pt-3">
            <p className="text-xl font-semibold text-ink">
              <span className="mr-2 inline-block min-w-10 rounded-lg bg-porcelain px-2 py-0.5 text-center text-brand">{it.quantity}×</span>
              {it.name}
              {it.variantName && <span className="ml-2 rounded bg-brand-soft px-2 py-0.5 text-base text-brand-deep">{it.variantName}</span>}
            </p>
            <Customizations it={it} big />
            {it.instructions && <p className="mt-2 rounded-lg bg-signal-soft px-3 py-1.5 text-base font-medium text-signal-deep">⚠ {it.instructions}</p>}
            {!stationId && <p className="mt-1 text-xs text-mute">{it.stationName}</p>}
          </li>
        ))}
      </ul>
      {order.notes && <p className="mt-3 rounded-lg bg-signal-soft px-3 py-2 text-base text-signal-deep">Note: {order.notes}</p>}
      {order.stations.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {order.stations.map((s) => (
            <span key={s.stationId} className={cx("rounded-full px-2.5 py-1", s.status === "ready" || s.status === "completed" ? "bg-ok text-[#ffffff]" : s.status === "preparing" ? "bg-warn-soft text-warn" : "bg-porcelain text-mute")}>
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
        <button onClick={() => act(order.id, { action: "priority", value: !order.priority })} aria-pressed={order.priority} aria-label="Toggle priority" className={cx("rounded-xl border px-4 text-lg", order.priority ? "border-signal bg-signal-soft text-signal" : "border-line text-mute")}>⚑</button>
        <button onClick={() => setVoice((v) => !v)} aria-label="Voice tools" className="rounded-xl border border-line px-4 text-lg text-mute">🔊</button>
      </footer>
      {voice && <VoicePanel order={order} />}
    </article>
  );
}
