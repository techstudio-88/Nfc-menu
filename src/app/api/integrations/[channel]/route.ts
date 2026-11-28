import { createHmac, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, restaurants } from "@/db/schema";
import { handle, HttpError } from "@/lib/api";
import { CHANNELS, ensureVirtualTable } from "@/lib/channels";
import { enabledMethods, getSettings, loadMenuTree, placeOrder } from "@/lib/orders";

type Incoming = {
  restaurant: string;
  externalId: string;
  customerName?: string;
  notes?: string;
  paid?: boolean;
  items: { itemId?: string; name?: string; variantId?: string | null; qty: number; instructions?: string }[];
};

function verify(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  const given = header.replace(/^sha256=/i, "").trim();
  const want = createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(given);
  const b = Buffer.from(want);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Aggregator / partner webhook. Body is signed: x-tapmenu-signature = hex HMAC-SHA256(raw body, INTEGRATION_WEBHOOK_SECRET). */
export const POST = handle(async (req, ctx) => {
  const { channel } = await ctx.params;
  const code = channel.toUpperCase();
  if (!CHANNELS[code] || CHANNELS[code].kind === "pickup") throw new HttpError(404, "Unknown channel.");
  const secret = process.env.INTEGRATION_WEBHOOK_SECRET;
  if (!secret) throw new HttpError(503, "Integrations are not configured (INTEGRATION_WEBHOOK_SECRET missing).");
  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-tapmenu-signature"), secret)) throw new HttpError(401, "Invalid signature.");
  let b: Incoming;
  try { b = JSON.parse(raw) as Incoming; } catch { throw new HttpError(400, "Invalid JSON body."); }
  if (!b.externalId || !Array.isArray(b.items) || !b.items.length) throw new HttpError(422, "externalId and items are required.");

  const [r] = await db.select({ id: restaurants.id }).from(restaurants).where(eq(restaurants.slug, String(b.restaurant ?? "").toLowerCase())).limit(1);
  if (!r) throw new HttpError(404, "Restaurant not found.");
  const settings = await getSettings(r.id);
  const tree = await loadMenuTree(r.id, settings.timezone);
  const byName = new Map(tree.items.map((i) => [i.name.trim().toLowerCase(), i.id]));
  const items = b.items.map((l) => {
    const itemId = l.itemId ?? byName.get(String(l.name ?? "").trim().toLowerCase());
    if (!itemId) throw new HttpError(422, `Could not match menu item "${l.name ?? l.itemId}".`);
    return { itemId, variantId: l.variantId ?? null, qty: Math.max(1, Math.min(50, Number(l.qty) || 1)), instructions: l.instructions };
  });
  const tableCode = await ensureVirtualTable(r.id, code);
  const method = enabledMethods(settings)[0] ?? "cash";
  const placed = await placeOrder(r.id, {
    items,
    tableCode,
    clientKey: `ext-${code.toLowerCase()}-${String(b.externalId).slice(0, 60)}`.padEnd(8, "0"),
    notes: `${CHANNELS[code].name} #${b.externalId}${b.customerName ? " · " + b.customerName : ""}${b.notes ? " · " + b.notes : ""}`.slice(0, 500),
    paymentMethod: method,
  });
  if (b.paid) await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, placed.id));
  return { ok: true, orderNo: placed.orderNo, duplicate: "duplicate" in placed ? placed.duplicate : false };
});
