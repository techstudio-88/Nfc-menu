import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { handle, HttpError, isUuid } from "@/lib/api";
import { summarizeOrder } from "@/lib/ai";
import { ALL_STAFF, requireTenant } from "@/lib/auth";
import { loadOrders } from "@/lib/orders";

export const POST = handle(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new HttpError(400, "Invalid order.");
  const t = await requireTenant(ALL_STAFF);
  const [o] = await loadOrders(t.restaurantId, { ids: [id] });
  if (!o) throw new HttpError(404, "Order not found.");
  const r = await summarizeOrder(o);
  await db.update(orders).set({ aiSummary: r.summary }).where(and(eq(orders.id, id), eq(orders.restaurantId, t.restaurantId)));
  return r;
});
