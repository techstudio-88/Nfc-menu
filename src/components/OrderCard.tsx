"use client";
import { useState } from "react";
import { api, minutesSince, useNow, useSpeech } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import { orderToSpeech } from "@/lib/orderText";
import type { OrderView } from "@/lib/orders";
import { Badge, Button, cx, Select, STATUS_TONE, useToast } from "@/components/ui";

export function Customizations({ it, big }: { it: OrderView["items"][number]; big?: boolean }) {
  const t = big ? "text-base" : "text-xs";
  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {it.customizations.map((c, i) => (
        <span
          key={i}
          className={cx(
            "rounded-md px-2 py-0.5 font-medium",
            t,
            c.action === "remove" && "bg-red-500/15 text-red-300 line-through decoration-red-400/70",
            c.action === "add" && "bg-amber-500/15 text-amber-200",
            c.action === "choice" && "bg-white/8 text-neutral-200",
          )}
        >
          {c.action === "remove" ? "NO " : c.action === "add" ? "+ " : ""}
          {c.optionName}
          {c.quantity > 1 ? ` ×${c.quantity}` : ""}
        </span>
      ))}
    </div>
  );
}

/** Speak order + AI summary. Always keeps the original order text beside the summary. */
export function VoicePanel({ order }: { order: OrderView }) {
  const sp = useSpeech();
  const toast = useToast();
  const [summary, setSummary] = useState<{ text: string; provider: string; note?: string } | null>(order.aiSummary ? { text: order.aiSummary, provider: "saved" } : null);
  const [busy, setBusy] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const original = orderToSpeech(order);

  const gen = async () => {
    setBusy(true);
    try {
      const r = await api<{ summary: string; provider: string; note?: string }>(`/api/orders/${order.id}/summary`, { method: "POST", body: {} });
      setSummary({ text: r.summary, provider: r.provider, note: r.note });
    } catch (e) {
      toast(e instanceof Error ? e.message : "Summary failed", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => sp.speak(original)} disabled={!sp.supported} title={sp.supported ? "Read the full order aloud" : "Speech is not supported in this browser"}>
          🔊 Speak order
        </Button>
        <Button size="sm" busy={busy} onClick={gen}>
          ✨ AI summary
        </Button>
        {summary && (
          <Button size="sm" variant="ghost" onClick={() => sp.speak(summary.text)} disabled={!sp.supported}>
            🔊 Speak summary
          </Button>
        )}
        {sp.state !== "idle" && (
          <div className="ml-auto flex items-center gap-1" role="group" aria-label="Speech controls">
            {sp.state === "speaking" ? (
              <Button size="sm" variant="ghost" onClick={sp.pause} aria-label="Pause">
                ⏸
              </Button>
            ) : (
              <Button size="sm" variant="ghost" onClick={sp.resume} aria-label="Resume">
                ▶
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={sp.stop} aria-label="Stop">
              ⏹
            </Button>
            <Button size="sm" variant="ghost" onClick={sp.replay} aria-label="Replay">
              ↺
            </Button>
          </div>
        )}
      </div>
      {!sp.supported && <p className="mt-2 text-xs text-amber-300/80">Text-to-speech isn’t available in this browser — use the written summary instead.</p>}
      {summary && (
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <div className="rounded-lg bg-amber-500/10 p-3 text-amber-50">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">Kitchen summary · {summary.provider}</p>
            {summary.text}
            {summary.note && <p className="mt-2 text-[11px] text-amber-200/60">{summary.note}</p>}
          </div>
          <div className="rounded-lg bg-white/5 p-3 text-neutral-200">
            <button className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400" onClick={() => setShowOriginal((v) => !v)}>
              Original order {showOriginal ? "▲" : "▼"}
            </button>
            {showOriginal ? <p>{original}</p> : <p className="text-neutral-400">The full original order is always listed above and read by “Speak order”.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

const NEXT_ACTIONS: Record<string, { to: string; label: string; roles: string[]; variant?: "primary" | "success" }[]> = {
  placed: [{ to: "accepted", label: "Accept", roles: ["owner", "manager", "kitchen"], variant: "primary" }],
  accepted: [{ to: "preparing", label: "Start preparing", roles: ["owner", "manager", "kitchen"], variant: "primary" }],
  preparing: [{ to: "ready", label: "Mark ready", roles: ["owner", "manager", "kitchen"], variant: "success" }],
  ready: [
    { to: "served", label: "Mark served", roles: ["owner", "manager", "waiter"], variant: "success" },
    { to: "completed", label: "Complete", roles: ["owner", "manager", "kitchen"] },
  ],
  served: [{ to: "completed", label: "Complete", roles: ["owner", "manager", "waiter"] }],
};

export function OrderCard({
  order,
  role,
  employees = [],
  meEmployeeId,
  onChange,
  highlight,
}: {
  order: OrderView;
  role: string;
  employees?: { id: string; name: string; title: string }[];
  meEmployeeId?: string | null;
  onChange: () => void;
  highlight?: boolean;
}) {
  const toast = useToast();
  const now = useNow(30000);
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(true);
  const act = async (key: string, body: Record<string, unknown>) => {
    setBusy(key);
    try {
      await api(`/api/orders/${order.id}`, { body });
      onChange();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed", "err");
    } finally {
      setBusy(null);
    }
  };
  const actions = (NEXT_ACTIONS[order.status] ?? []).filter((a) => a.roles.includes(role));
  const canCancel = ["owner", "manager"].includes(role) && ["placed", "accepted", "preparing"].includes(order.status);
  const mins = minutesSince(order.createdAt, now);
  const canAssign = ["owner", "manager", "waiter"].includes(role) && !["completed", "cancelled"].includes(order.status);

  return (
    <article className={cx("rounded-2xl border bg-neutral-900/70 p-4 transition", highlight ? "border-amber-400/60 shadow-[0_0_40px_-10px_rgba(251,191,36,.5)]" : "border-white/10")} aria-label={`Order ${order.orderNo}`}>
      <header className="flex flex-wrap items-center gap-2">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 text-left" aria-expanded={open}>
          <span className="font-display text-2xl text-white">#{order.orderNo}</span>
          <span className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-sm font-semibold text-amber-300">Table {order.tableCode}</span>
        </button>
        <Badge tone={STATUS_TONE[order.status]}>{order.status}</Badge>
        {order.priority && <Badge tone="red">priority</Badge>}
        <Badge tone={order.paymentStatus === "paid" ? "green" : "neutral"}>
          {order.paymentMethod.replace(/_/g, " ")} · {order.paymentStatus}
        </Badge>
        <span className="ml-auto text-xs text-neutral-400">
          {mins < 1 ? "just now" : `${mins} min ago`} · <span className="font-medium text-neutral-200">{formatMoney(order.total, order.currency)}</span>
        </span>
      </header>

      {open && (
        <>
          <ul className="mt-3 divide-y divide-white/5">
            {order.items.map((it) => (
              <li key={it.id} className="py-2">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-white">
                    <span className="mr-2 inline-flex min-w-7 justify-center rounded-md bg-white/10 px-1.5 py-0.5 text-amber-300">{it.quantity}×</span>
                    {it.name}
                    {it.variantName && <span className="text-neutral-400"> · {it.variantName}</span>}
                  </p>
                  <span className="text-xs text-neutral-500">{it.stationName}</span>
                </div>
                <Customizations it={it} />
                {it.instructions && <p className="mt-1.5 text-xs italic text-amber-200/90">“{it.instructions}”</p>}
              </li>
            ))}
          </ul>
          {order.notes && <p className="mt-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-100">Order note: {order.notes}</p>}
          {order.stations.length > 1 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {order.stations.map((s) => (
                <Badge key={s.stationId} tone={STATUS_TONE[s.status === "completed" ? "completed" : s.status]}>
                  {s.stationName}: {s.status}
                </Badge>
              ))}
            </div>
          )}
          <VoicePanel order={order} />
        </>
      )}

      <footer className="mt-3 flex flex-wrap items-center gap-2">
        {actions.map((a) => (
          <Button key={a.to} variant={a.variant} size="sm" busy={busy === a.to} onClick={() => act(a.to, { action: "status", to: a.to })}>
            {a.label}
          </Button>
        ))}
        {order.paymentStatus === "pending" && order.status !== "cancelled" && ["owner", "manager", "waiter"].includes(role) && (
          <Button size="sm" busy={busy === "paid"} onClick={() => act("paid", { action: "paid" })}>
            💵 Mark paid
          </Button>
        )}
        {canCancel && (
          <Button size="sm" variant="danger" busy={busy === "cancelled"} onClick={() => confirm(`Cancel order #${order.orderNo}?`) && act("cancelled", { action: "status", to: "cancelled" })}>
            Cancel
          </Button>
        )}
        {canAssign && (
          <div className="ml-auto flex items-center gap-2">
            {role === "waiter" ? (
              order.assignedEmployeeId === meEmployeeId ? (
                <Badge tone="green">Assigned to you</Badge>
              ) : (
                <Button size="sm" onClick={() => act("assign", { action: "assign", employeeId: meEmployeeId })}>
                  Take this order{order.assignedEmployeeName ? ` (from ${order.assignedEmployeeName})` : ""}
                </Button>
              )
            ) : (
              <Select aria-label="Assign employee" className="!w-auto !py-1 text-xs" value={order.assignedEmployeeId ?? ""} onChange={(e) => act("assign", { action: "assign", employeeId: e.target.value || null })}>
                <option value="">Unassigned</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
        )}
      </footer>
    </article>
  );
}

export function AlertBar({ rt }: { rt: { connected: boolean; audioReady: boolean; enableAlerts: () => void; perm: string; blocked: boolean } }) {
  const needs = !rt.audioReady || rt.blocked || rt.perm === "default";
  return (
    <div className="mb-4 space-y-2">
      {!rt.connected && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200" role="alert">
          Connection lost — reconnecting automatically. Orders are safe; the list refreshes once you’re back online.
        </div>
      )}
      {needs && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-100">
          <span>
            {rt.blocked ? "Your browser blocked the alert sound. " : ""}
            Enable sound{rt.perm === "default" ? " and notifications" : ""} so new orders are never missed.
            {rt.perm === "denied" && " (Notifications are blocked in browser settings — on-screen and sound alerts still work while this page is open.)"}
            {rt.perm === "unsupported" && " (System notifications aren’t supported here; sound and on-screen alerts remain active.)"}
          </span>
          <Button size="sm" variant="primary" onClick={rt.enableAlerts}>
            🔔 Enable alerts
          </Button>
        </div>
      )}
    </div>
  );
}
