import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customerFeedback, orders, restaurants } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { loadOrders } from "@/lib/orders";
import { confirmCheckout, createCheckout } from "@/lib/payments";

export const dynamic = "force-dynamic";

async function find(token: string) {
  const [o] = await db.select().from(orders).where(eq(orders.publicToken, token)).limit(1);
  if (!o) throw new HttpError(404, "Order not found.");
  return o;
}

export const GET = handle(async (_req, ctx) => {
  const { token } = await ctx.params;
  const o = await find(token);
  const [r] = await db.select().from(restaurants).where(eq(restaurants.id, o.restaurantId)).limit(1);
  const [view] = await loadOrders(o.restaurantId, { token });
  const [fb] = await db.select({ rating: customerFeedback.rating }).from(customerFeedback).where(eq(customerFeedback.orderId, o.id)).limit(1);
  const { aiSummary: _a, assignedEmployeeId: _e, ...pub } = view;
  void _a;
  void _e;
  return {
    order: pub,
    feedback: fb ?? null,
    restaurant: { name: r.name, slug: r.slug, primaryColor: r.primaryColor, accentColor: r.accentColor, logoUrl: r.logoAssetId ? `/api/assets/${r.logoAssetId}` : null },
  };
});

export const POST = handle(async (req, ctx) => {
  const { token } = await ctx.params;
  const o = await find(token);
  const b = await body<{ action: string; rating?: number; comment?: string; sessionId?: string }>(req);
  if (b.action === "feedback") {
    const rating = Math.round(Number(b.rating));
    if (!(rating >= 1 && rating <= 5)) throw new HttpError(400, "Rating must be 1–5.");
    const [ex] = await db.select({ id: customerFeedback.id }).from(customerFeedback).where(eq(customerFeedback.orderId, o.id)).limit(1);
    if (ex) throw new HttpError(409, "Thanks — feedback already received.");
    await db.insert(customerFeedback).values({ restaurantId: o.restaurantId, orderId: o.id, rating, comment: String(b.comment ?? "").slice(0, 500) });
    return { ok: true };
  }
  if (b.action === "checkout") {
    if (o.paymentMethod !== "online" || o.paymentStatus === "paid") throw new HttpError(409, "No online payment is due for this order.");
    const [r] = await db.select().from(restaurants).where(eq(restaurants.id, o.restaurantId)).limit(1);
    const origin = req.headers.get("origin") ?? req.nextUrl.origin;
    return createCheckout(o, r.slug, r.name, origin);
  }
  if (b.action === "confirm") {
    if (!b.sessionId) throw new HttpError(400, "Missing session.");
    return confirmCheckout(o, b.sessionId);
  }
  throw new HttpError(400, "Unknown action.");
});
