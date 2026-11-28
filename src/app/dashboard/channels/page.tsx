"use client";
import { useMemo, useRef, useState } from "react";
import { api, useRealtime } from "@/lib/client";
import { CHANNELS } from "@/lib/channelMeta";
import { formatMoney } from "@/lib/pricing";
import type { OrderView } from "@/lib/orders";
import { Badge, Button, Card, CountUp, ErrorState, Loading, PageHeader, STATUS_TONE, useAsync, useToast } from "@/components/ui";

type R = { orders: OrderView[] };
const DELIVERY = Object.entries(CHANNELS).filter(([, c]) => c.kind !== "pickup");

export default function ChannelsPage() {
  const toast = useToast();
  const o = useAsync<R>(() => api<R>("/api/orders?view=all&days=7&limit=300"), []);
  const [busy, setBusy] = useState("");
  const [fresh, setFresh] = useState<string[]>([]);
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useRealtime({ scope: "owner", onEvents: (e) => { if (e.some((x) => x.type === "order_new")) { o.reload(); setFresh(e.filter((x) => x.orderId).map((x) => x.orderId!)); clearTimeout(t.current); t.current = setTimeout(() => setFresh([]), 15000); } } });

  const ch = useMemo(() => (o.data?.orders ?? []).filter((x) => CHANNELS[x.tableCode]), [o.data]);
  const stats = useMemo(() => Object.entries(CHANNELS).map(([code, c]) => {
    const rows = ch.filter((x) => x.tableCode === code && x.status !== "cancelled");
    return { code, ...c, count: rows.length, revenue: rows.reduce((a, x) => a + x.total, 0) };
  }).filter((s) => s.count > 0 || s.kind === "delivery"), [ch]);
  const total = stats.reduce((a, s) => a + s.revenue, 0);

  const simulate = async (code: string) => {
    setBusy(code);
    try { await api("/api/channels", { body: { channel: code } }); toast(`Simulated ${CHANNELS[code].name} order received`, "ok"); o.reload(); }
    catch (e) { toast(e instanceof Error ? e.message : "Failed", "err"); } finally { setBusy(""); }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Order channels" sub="Swiggy, Zomato, ONDC, your website, takeaway and delivery — every order in one live feed." />
      {o.loading ? <Loading /> : o.error ? <ErrorState message={o.error} retry={() => o.reload()} /> : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.code} className="relative overflow-hidden">
                <span className="absolute inset-x-0 top-0 h-1" style={{ background: s.color }} />
                <p className="text-xs font-semibold uppercase tracking-wider text-mute">{s.name}</p>
                <p className="mt-2 font-display text-3xl text-ink"><CountUp value={s.count} /></p>
                <p className="text-xs text-mute">orders · {formatMoney(s.revenue)} (7 days)</p>
                {s.kind !== "pickup" && <Button size="sm" variant="subtle" className="mt-3" busy={busy === s.code} onClick={() => simulate(s.code)}>▶ Simulate order</Button>}
              </Card>
            ))}
          </div>
          <Card>
            <p className="text-sm text-mute">7-day revenue across channels</p>
            <p className="font-display text-4xl text-ink"><CountUp value={formatMoney(total)} /></p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-porcelain">{stats.filter((s) => s.revenue > 0).map((s) => <span key={s.code} title={s.name} style={{ width: `${(s.revenue / (total || 1)) * 100}%`, background: s.color, transition: "width 1s cubic-bezier(.2,.8,.2,1)" }} />)}</div>
          </Card>
          <Card>
            <h2 className="font-display text-2xl text-ink">Unified order feed</h2>
            <ul className="mt-4 divide-y divide-line">
              {ch.slice(0, 40).map((x) => (
                <li key={x.id} className={`flex flex-wrap items-center gap-3 py-3 ${fresh.includes(x.id) ? "animate-pulse" : ""}`}>
                  <span className="rounded-full px-3 py-1 text-xs font-semibold text-[#ffffff]" style={{ background: CHANNELS[x.tableCode].color }}>{CHANNELS[x.tableCode].name}</span>
                  <span className="font-display text-xl text-ink">#{x.orderNo}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-mute">{x.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
                  <Badge tone={STATUS_TONE[x.status] ?? "neutral"}>{x.status}</Badge>
                  <span className="text-sm font-medium text-ink">{formatMoney(x.total, x.currency)}</span>
                </li>
              ))}
              {!ch.length && <li className="py-10 text-center text-sm text-mute">No channel orders yet. Press “Simulate order” to see one arrive live.</li>}
            </ul>
          </Card>
          <Card>
            <h2 className="font-display text-2xl text-ink">Connect your delivery apps</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mute">Zomato and Swiggy do not give restaurants a public API. Connect through a partner such as UrbanPiper, Petpooja or Dyno and point its order webhook here. Each request must carry an <code className="rounded bg-porcelain px-1">x-tapmenu-signature</code> header (HMAC-SHA256 of the body using your <code className="rounded bg-porcelain px-1">INTEGRATION_WEBHOOK_SECRET</code>).</p>
            <div className="mt-4 space-y-2">
              {DELIVERY.map(([code, c]) => <p key={code} className="overflow-x-auto rounded-xl bg-porcelain px-3 py-2 font-mono text-xs text-ink">POST https://YOUR-DOMAIN/api/integrations/{code.toLowerCase()} <span className="text-mute">· {c.name}</span></p>)}
            </div>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-brand-night p-4 text-xs leading-6 text-[#f3d6d9]">{`{
  "restaurant": "your-slug",
  "externalId": "SW-48211",
  "customerName": "Aarav",
  "paid": true,
  "items": [{ "name": "Margherita", "qty": 2 }]
}`}</pre>
          </Card>
        </>
      )}
    </div>
  );
}
