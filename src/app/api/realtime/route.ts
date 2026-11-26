import { and, asc, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { handle, HttpError, isUuid } from "@/lib/api";
import { ALL_STAFF, requireTenant } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export const dynamic = "force-dynamic";

/* Cursor-based event feed over the persisted notification log.
   Events survive tab closes and network drops: clients resume from their last cursor, and every
   fetch increments attempts / stamps delivered_at so delivery is tracked. */
export const GET = handle(async (req) => {
  const t = await requireTenant(ALL_STAFF);
  const sp = req.nextUrl.searchParams;
  const scope = sp.get("scope") ?? "owner";
  const settings = await getSettings(t.restaurantId);
  const sound = { enabled: settings.soundEnabled, name: settings.newOrderSound };

  const [{ latest }] = await db.select({ latest: sql<number>`coalesce(max(${notifications.id}),0)::int` }).from(notifications).where(eq(notifications.restaurantId, t.restaurantId));
  const sinceRaw = sp.get("since");
  if (sinceRaw === null) return { events: [], cursor: latest, sound };
  const since = Math.max(0, Number(sinceRaw) || 0);

  let target;
  if (scope === "owner") {
    if (!["owner", "manager"].includes(t.role)) throw new HttpError(403, "Not allowed.");
    target = eq(notifications.targetType, "owner");
  } else if (scope === "kitchen") {
    if (!["owner", "manager", "kitchen"].includes(t.role)) throw new HttpError(403, "Not allowed.");
    const st = sp.get("station");
    target = st && isUuid(st) ? and(eq(notifications.targetType, "station"), eq(notifications.targetId, st)) : eq(notifications.targetType, "station");
  } else if (scope === "staff") {
    if (!t.employeeId) return { events: [], cursor: Math.max(since, latest), sound };
    target = and(eq(notifications.targetType, "employee"), eq(notifications.targetId, t.employeeId));
  } else throw new HttpError(400, "Unknown scope.");

  const events = await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.restaurantId, t.restaurantId), gt(notifications.id, since), target))
    .orderBy(asc(notifications.id))
    .limit(50);
  if (events.length) {
    await db
      .update(notifications)
      .set({ attempts: sql`${notifications.attempts} + 1`, deliveredAt: sql`coalesce(${notifications.deliveredAt}, now())` })
      .where(inArray(notifications.id, events.map((e) => e.id)));
  }
  // cursor advances to the newest id seen in this scope; if the page is full, continue from the last event
  const cursor = events.length === 50 ? events[events.length - 1].id : Math.max(since, latest);
  return { events: events.map((e) => ({ id: e.id, type: e.type, title: e.title, body: e.body, orderId: e.orderId, createdAt: e.createdAt })), cursor, sound };
});
