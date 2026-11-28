import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { OWNER_ROLES, requireTenant } from "@/lib/auth";
import { CHANNELS, ensureVirtualTable } from "@/lib/channels";
import { enabledMethods, getSettings, loadMenuTree, placeOrder } from "@/lib/orders";

const FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Ananya", "Vikram", "Isha"];

/** Demo helper: simulate an incoming aggregator order so owners (and prospects) can watch it land live. */
export const POST = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const b = await body<{ channel?: string }>(req);
  const code = String(b.channel ?? "SWIGGY").toUpperCase();
  if (!CHANNELS[code] || CHANNELS[code].kind === "pickup") throw new HttpError(422, "Unknown channel.");
  const settings = await getSettings(t.restaurantId);
  const tree = await loadMenuTree(t.restaurantId, settings.timezone);
  const pool = tree.items.filter((i) => i.available && i.availableNow && !i.groups.some((g) => g.minSelect > 0));
  if (!pool.length) throw new HttpError(422, "Add at least one available dish (without required options) to the menu first.");
  const pick = [...pool].sort(() => Math.random() - 0.5).slice(0, Math.min(pool.length, 1 + Math.floor(Math.random() * 3)));
  const tableCode = await ensureVirtualTable(t.restaurantId, code);
  const ext = Math.floor(100000 + Math.random() * 900000);
  const placed = await placeOrder(t.restaurantId, {
    items: pick.map((i) => ({ itemId: i.id, variantId: i.variants[0]?.id ?? null, qty: 1 + Math.floor(Math.random() * 2) })),
    tableCode,
    clientKey: `sim-${code.toLowerCase()}-${randomBytes(6).toString("hex")}`,
    notes: `${CHANNELS[code].name} #${ext} · ${FIRST[Math.floor(Math.random() * FIRST.length)]} (simulated)`,
    paymentMethod: enabledMethods(settings)[0] ?? "cash",
  });
  await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, placed.id));
  return { ok: true, orderNo: placed.orderNo };
});
