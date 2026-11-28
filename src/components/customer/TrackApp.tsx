"use client";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import type { OrderView } from "@/lib/orders";

type Pub = Omit<OrderView, "aiSummary" | "assignedEmployeeId">;
type Resp = { order: Pub; feedback: { rating: number } | null; restaurant: { name: string; slug: string; primaryColor: string; accentColor: string; logoUrl: string | null } };

const STEPS = [
  { k: "placed", label: "Order received", icon: "🧾", sub: "Waiting for the kitchen to accept" },
  { k: "accepted", label: "Accepted", icon: "👨‍🍳", sub: "The kitchen has your order" },
  { k: "preparing", label: "Preparing", icon: "🔥", sub: "Your dishes are being made" },
  { k: "ready", label: "Ready", icon: "✨", sub: "On its way to your table" },
  { k: "served", label: "Served", icon: "🍽️", sub: "Enjoy your meal" },
];
const idx = (s: string) => (s === "completed" ? 4 : STEPS.findIndex((x) => x.k === s));

export default function TrackApp({ slug, token }: { slug: string; token: string }) {
  const sp = useSearchParams();
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [payMsg, setPayMsg] = useState("");
  const fresh = sp.get("new") === "1";
  const sessionId = sp.get("session_id");

  const load = useCallback(async () => {
    try {
      setData(await api<Resp>(`/api/public/orders/${token}`));
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load order");
    }
  }, [token]);

  useEffect(() => {
    void load();
    const i = setInterval(load, 4000);
    return () => clearInterval(i);
  }, [load]);

  useEffect(() => {
    if (!sessionId) return;
    api<{ paid: boolean }>(`/api/public/orders/${token}`, { body: { action: "confirm", sessionId } })
      .then((r) => {
        setPayMsg(r.paid ? "Payment received — thank you!" : "Payment not completed yet.");
        void load();
      })
      .catch((e) => setPayMsg(e.message));
  }, [sessionId, token, load]);

  const payNow = async () => {
    try {
      const r = await api<{ url: string }>(`/api/public/orders/${token}`, { body: { action: "checkout" } });
      window.location.href = r.url;
    } catch (e) {
      setPayMsg(e instanceof Error ? e.message : "Failed");
    }
  };

  if (err && !data)
    return (
      <div className="grid min-h-dvh place-items-center bg-neutral-950 p-6 text-center">
        <div>
          <p className="font-display text-3xl text-white">Order not found</p>
          <p className="mt-2 text-sm text-neutral-400">{err}</p>
          <Link href={`/r/${slug}`} className="mt-5 inline-block rounded-full bg-rose-500 px-6 py-2.5 font-medium text-black">
            Back to menu
          </Link>
        </div>
      </div>
    );
  if (!data)
    return (
      <div className="grid min-h-dvh place-items-center bg-neutral-950">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-rose-400/30 border-t-rose-300" />
      </div>
    );

  const o = data.order;
  const cancelled = o.status === "cancelled";
  const cur = idx(o.status);
  const brand = data.restaurant.primaryColor;
  const sendFeedback = async () => {
    try {
      await api(`/api/public/orders/${token}`, { body: { action: "feedback", rating, comment } });
      setSent(true);
    } catch (e) {
      setPayMsg(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="tm-dark relative min-h-dvh overflow-hidden bg-[#0b0b0b] px-5 pb-16 pt-8 text-neutral-100" style={{ ["--brand" as string]: brand }}>
      <div className="pointer-events-none absolute -top-32 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full opacity-30 blur-[100px]" style={{ background: brand }} />
      <div className="relative mx-auto max-w-md">
        <Link href={`/r/${slug}`} className="text-sm text-neutral-400 hover:text-white">
          ← {data.restaurant.name}
        </Link>

        <motion.div initial={fresh ? { scale: 0.6, opacity: 0 } : false} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }} className="mt-8 text-center">
          {cancelled ? (
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-full border border-red-500/40 bg-red-500/10 text-4xl">✕</div>
          ) : (
            <div className="relative mx-auto grid h-24 w-24 place-items-center rounded-full" style={{ background: `linear-gradient(135deg, ${brand}, ${data.restaurant.accentColor})` }}>
              {fresh && <motion.span className="absolute inset-0 rounded-full" style={{ border: `2px solid ${brand}` }} initial={{ scale: 1, opacity: 0.8 }} animate={{ scale: 2.2, opacity: 0 }} transition={{ duration: 1.4, repeat: 2 }} />}
              <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 12l5 5L20 6" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "drawcheck .6s .3s forwards" }} />
              </svg>
            </div>
          )}
          <h1 className="font-display mt-5 text-4xl">{cancelled ? "Order cancelled" : fresh && cur === 0 ? "Order placed!" : STEPS[Math.max(0, cur)].label}</h1>
          <p className="mt-1 text-neutral-400">
            Order #{o.orderNo} · Table {o.tableCode}
          </p>
          {!cancelled && <p className="mt-2 text-sm text-neutral-300">{STEPS[Math.max(0, cur)].sub}</p>}
        </motion.div>

        {!cancelled && (
          <ol className="mt-10 space-y-0" aria-label="Order progress">
            {STEPS.map((s, i) => {
              const done = i <= cur;
              return (
                <li key={s.k} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && <span className="absolute left-[19px] top-10 h-[calc(100%-2rem)] w-0.5 bg-white/10"><motion.span className="block w-full" style={{ background: brand }} initial={false} animate={{ height: i < cur ? "100%" : "0%" }} transition={{ duration: 0.6 }} /></span>}
                  <motion.span animate={{ scale: i === cur ? [1, 1.15, 1] : 1 }} transition={{ repeat: i === cur && cur < 4 ? Infinity : 0, duration: 1.8 }} className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border text-lg ${done ? "border-transparent text-black" : "border-white/15 text-neutral-500"}`} style={done ? { background: brand } : undefined}>
                    {s.icon}
                  </motion.span>
                  <div className="pt-1.5">
                    <p className={done ? "font-medium text-white" : "text-neutral-500"}>{s.label}</p>
                    {i === cur && <p className="text-xs text-neutral-400">{s.sub}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
        )}

        {o.stations.length > 1 && !cancelled && cur < 3 && (
          <div className="mt-6 flex flex-wrap justify-center gap-2 text-xs">
            {o.stations.map((s) => (
              <span key={s.stationId} className="rounded-full border border-white/10 px-3 py-1 text-neutral-300">
                {s.stationName}: {s.status === "completed" ? "ready" : s.status}
              </span>
            ))}
          </div>
        )}

        <section className="mt-10 rounded-3xl border border-white/10 bg-neutral-900/60 p-5">
          <h2 className="font-display text-2xl">Your order</h2>
          <ul className="mt-3 divide-y divide-white/5 text-sm">
            {o.items.map((it) => (
              <li key={it.id} className="py-2.5">
                <div className="flex justify-between gap-3">
                  <span>
                    {it.quantity}× {it.name}
                    {it.variantName ? ` · ${it.variantName}` : ""}
                  </span>
                  <span className="tabular-nums text-neutral-300">{formatMoney(it.lineTotal, o.currency)}</span>
                </div>
                {it.customizations.length > 0 && <p className="mt-0.5 text-xs text-neutral-500">{it.customizations.map((c) => (c.action === "remove" ? `No ${c.optionName}` : c.action === "add" ? `+ ${c.optionName}${c.quantity > 1 ? ` ×${c.quantity}` : ""}` : c.optionName)).join(" · ")}</p>}
                {it.instructions && <p className="mt-0.5 text-xs italic text-rose-300/80">“{it.instructions}”</p>}
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1 border-t border-white/10 pt-3 text-sm text-neutral-400">
            <div className="flex justify-between"><dt>Subtotal</dt><dd className="tabular-nums">{formatMoney(o.subtotal, o.currency)}</dd></div>
            {o.discount > 0 && <div className="flex justify-between text-emerald-400"><dt>Discount</dt><dd className="tabular-nums">− {formatMoney(o.discount, o.currency)}</dd></div>}
            {o.serviceCharge > 0 && <div className="flex justify-between"><dt>Service</dt><dd className="tabular-nums">{formatMoney(o.serviceCharge, o.currency)}</dd></div>}
            {o.tax > 0 && <div className="flex justify-between"><dt>Tax</dt><dd className="tabular-nums">{formatMoney(o.tax, o.currency)}</dd></div>}
            {o.fees > 0 && <div className="flex justify-between"><dt>Fees</dt><dd className="tabular-nums">{formatMoney(o.fees, o.currency)}</dd></div>}
            <div className="flex items-baseline justify-between pt-1 text-white"><dt className="font-display text-xl">Total</dt><dd className="font-display text-2xl tabular-nums" style={{ color: brand }}>{formatMoney(o.total, o.currency)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-neutral-500">
            Payment: {o.paymentMethod.replace(/_/g, " ")} · <span className={o.paymentStatus === "paid" ? "text-emerald-400" : "text-rose-300"}>{o.paymentStatus}</span>
          </p>
          {o.paymentMethod === "online" && o.paymentStatus !== "paid" && !cancelled && (
            <button onClick={payNow} className="mt-3 w-full rounded-full py-3 font-semibold text-black" style={{ background: brand }}>
              Pay now
            </button>
          )}
          {payMsg && <p className="mt-2 text-sm text-rose-200" role="status">{payMsg}</p>}
        </section>

        <AnimatePresence>
          {(o.status === "served" || o.status === "completed") && !data.feedback && !sent && (
            <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-3xl border border-white/10 bg-neutral-900/60 p-5 text-center">
              <h2 className="font-display text-2xl">How was everything?</h2>
              <div className="mt-3 flex justify-center gap-2" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} role="radio" aria-checked={rating === n} aria-label={`${n} stars`} onClick={() => setRating(n)} className={`text-3xl transition ${n <= rating ? "scale-110" : "opacity-30"}`}>
                    ★
                  </button>
                ))}
              </div>
              <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Tell us more (optional)" rows={2} className="mt-3 w-full rounded-2xl border border-white/10 bg-transparent px-4 py-3 text-sm outline-none" />
              <button disabled={!rating} onClick={sendFeedback} className="mt-3 rounded-full px-6 py-2.5 font-semibold text-black disabled:opacity-40" style={{ background: brand }}>
                Send feedback
              </button>
            </motion.section>
          )}
          {(data.feedback || sent) && <p className="mt-6 text-center text-sm text-neutral-400">Thank you for your feedback ♥</p>}
        </AnimatePresence>

        <Link href={`/r/${slug}`} className="mt-8 block text-center text-sm text-neutral-400 underline-offset-4 hover:underline">
          Order something else
        </Link>
      </div>
    </div>
  );
}
