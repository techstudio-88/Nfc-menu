import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { assistanceRequests } from "@/db/schema";
import { body, handle, HttpError, isUuid } from "@/lib/api";
import { ALL_STAFF, requireTenant } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const t = await requireTenant(["owner", "manager", "waiter"]);
  const rows = await db.select().from(assistanceRequests).where(and(eq(assistanceRequests.restaurantId, t.restaurantId), eq(assistanceRequests.status, "open"))).orderBy(desc(assistanceRequests.createdAt)).limit(50);
  return { rows };
});

export const POST = handle(async (req) => {
  const t = await requireTenant(ALL_STAFF, { write: true });
  const b = await body<{ id: string }>(req);
  if (!isUuid(b.id)) throw new HttpError(400, "Invalid id.");
  await db.update(assistanceRequests).set({ status: "resolved", resolvedAt: new Date() }).where(and(eq(assistanceRequests.id, b.id), eq(assistanceRequests.restaurantId, t.restaurantId)));
  return { ok: true };
});
