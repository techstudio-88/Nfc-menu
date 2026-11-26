import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderStatusHistory, orders, paymentRecords } from "@/db/schema";
import { HttpError } from "@/lib/api";

/* Payment provider abstraction. "stripe" is implemented (Checkout Sessions, verified server-side with the
   secret key — no trust in browser redirects). Cash / card-at-table are settled by staff. */

export const onlineProviderReady = () => !!process.env.STRIPE_SECRET_KEY;

async function stripe(path: string, init?: { method?: string; form?: URLSearchParams }) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: init?.method ?? "GET",
    headers: {
      authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(init?.form ? { "content-type": "application/x-www-form-urlencoded" } : {}),
    },
    body: init?.form,
    signal: AbortSignal.timeout(15000),
  });
  const j = (await res.json()) as Record<string, unknown> & { error?: { message?: string } };
  if (!res.ok) throw new HttpError(502, j.error?.message ?? "Payment provider error");
  return j;
}

export async function createCheckout(order: typeof orders.$inferSelect, slug: string, restaurantName: string, origin: string) {
  if (!onlineProviderReady()) throw new HttpError(422, "Online payments are not configured.");
  const f = new URLSearchParams();
  f.set("mode", "payment");
  f.set("success_url", `${origin}/r/${slug}/track/${order.publicToken}?session_id={CHECKOUT_SESSION_ID}`);
  f.set("cancel_url", `${origin}/r/${slug}/track/${order.publicToken}`);
  f.set("client_reference_id", order.id);
  f.set("line_items[0][quantity]", "1");
  f.set("line_items[0][price_data][currency]", order.currency.toLowerCase());
  f.set("line_items[0][price_data][unit_amount]", String(order.total));
  f.set("line_items[0][price_data][product_data][name]", `${restaurantName} · Order #${order.orderNo}`);
  const s = await stripe("/checkout/sessions", { method: "POST", form: f });
  await db.update(paymentRecords).set({ externalRef: String(s.id) }).where(and(eq(paymentRecords.orderId, order.id), eq(paymentRecords.status, "pending")));
  return { url: String(s.url) };
}

export async function confirmCheckout(order: typeof orders.$inferSelect, sessionId: string) {
  if (order.paymentStatus === "paid") return { paid: true };
  const s = await stripe(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
  const ok = s.payment_status === "paid" && s.client_reference_id === order.id && s.amount_total === order.total;
  if (!ok) return { paid: false };
  await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, order.id));
  await db.update(paymentRecords).set({ status: "paid", paidAt: new Date(), externalRef: sessionId }).where(and(eq(paymentRecords.orderId, order.id), eq(paymentRecords.status, "pending")));
  await db.insert(orderStatusHistory).values({ orderId: order.id, restaurantId: order.restaurantId, fromStatus: order.status, toStatus: order.status, actorName: "stripe", note: "Online payment confirmed" });
  return { paid: true };
}
