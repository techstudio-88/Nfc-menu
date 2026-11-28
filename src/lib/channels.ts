import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { branches, tables } from "@/db/schema";
import { HttpError } from "@/lib/api";

import { CHANNELS } from "@/lib/channelMeta";
export { CHANNELS, channelOf } from "@/lib/channelMeta";

export async function ensureVirtualTable(restaurantId: string, code: string) {
  const c = code.trim().toUpperCase();
  const [hit] = await db.select().from(tables).where(and(eq(tables.restaurantId, restaurantId), eq(tables.code, c))).limit(1);
  if (hit) {
    if (!hit.active) await db.update(tables).set({ active: true }).where(eq(tables.id, hit.id));
    return c;
  }
  const [branch] = await db.select().from(branches).where(and(eq(branches.restaurantId, restaurantId), eq(branches.active, true))).orderBy(asc(branches.createdAt)).limit(1);
  if (!branch) throw new HttpError(422, "Create a branch first (Tables & NFC) before using channels or POS orders.");
  await db.insert(tables).values({ restaurantId, branchId: branch.id, code: c, label: CHANNELS[c]?.name ?? c, seats: 0 });
  return c;
}
