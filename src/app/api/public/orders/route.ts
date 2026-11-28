import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { placeOrder, type OrderInput } from "@/lib/orders";

const recent = new Map<string, number[]>();

export const POST = handle(async (req) => {
  const b = await body<OrderInput & { slug: string; tableCode?: string; cardToken?: string; clientKey: string; customerKey?: string; notes?: string; paymentMethod: string; language?: string }>(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 12) throw new HttpError(429, "Too many orders from this device. Please wait a minute.");
  recent.set(ip, [...hits, now]);
  const [r] = await db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.slug, String(b.slug ?? "").toLowerCase())).limit(1);
  if (!r) throw new HttpError(404, "Restaurant not found.");
  // price, totals, names and station routing are all recomputed server-side; client numbers are never read
  return placeOrder(r.id, {
    items: b.items,
    couponCode: b.couponCode,
    tableCode: b.tableCode,
    cardToken: b.cardToken,
    clientKey: String(b.clientKey ?? ""),
    customerKey: String(b.customerKey ?? ""),
    notes: b.notes,
    paymentMethod: String(b.paymentMethod ?? ""),
    language: b.language,
  });
});
