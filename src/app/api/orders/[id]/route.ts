import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { body, handle, HttpError, isUuid } from "@/lib/api";
import { ALL_STAFF, requireTenant } from "@/lib/auth";
import { assignOrder, changeOrderStatus, changeStationStatus, markPaid } from "@/lib/orders";

export const POST = handle(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!isUuid(id)) throw new HttpError(400, "Invalid order.");
  const t = await requireTenant(ALL_STAFF, { write: true });
  const b = await body<{ action: string; to?: string; note?: string; stationId?: string; employeeId?: string | null; value?: boolean }>(req);
  switch (b.action) {
    case "status":
      return changeOrderStatus(t, id, String(b.to), String(b.note ?? "").slice(0, 200));
    case "station":
      if (!isUuid(b.stationId)) throw new HttpError(400, "Invalid station.");
      return changeStationStatus(t, id, b.stationId, String(b.to));
    case "assign":
      return assignOrder(t, id, b.employeeId && isUuid(b.employeeId) ? b.employeeId : null);
    case "paid":
      return markPaid(t, id);
    case "priority":
      if (!["owner", "manager", "kitchen"].includes(t.role)) throw new HttpError(403, "Not allowed.");
      await db.update(orders).set({ priority: !!b.value }).where(and(eq(orders.id, id), eq(orders.restaurantId, t.restaurantId)));
      return { ok: true };
    default:
      throw new HttpError(400, "Unknown action.");
  }
});
