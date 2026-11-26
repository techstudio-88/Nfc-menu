import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { quoteOrder, type OrderInput } from "@/lib/orders";

export const POST = handle(async (req) => {
  const b = await body<OrderInput & { slug: string }>(req);
  const [r] = await db.select({ id: restaurants.id, status: restaurants.status }).from(restaurants).where(eq(restaurants.slug, String(b.slug ?? "").toLowerCase())).limit(1);
  if (!r || r.status !== "active") throw new HttpError(404, "Restaurant not found.");
  const q = await quoteOrder(r.id, b);
  return {
    lines: q.lines.map((l) => ({ itemId: l.itemId, name: l.name, unitPrice: l.unitPrice, qty: l.qty, lineTotal: l.lineTotal, errors: l.errors })),
    errors: q.errors,
    totals: q.totals,
    couponError: q.couponError,
    couponApplied: q.coupon?.code ?? null,
  };
});
