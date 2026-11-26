import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { branches, employees, foodAssets, menuItems, restaurantSettings, restaurants, subscriptions, tables } from "@/db/schema";
import { body, handle, HttpError, isUuid } from "@/lib/api";
import { OWNER_ROLES, requireTenant } from "@/lib/auth";
import { getLimits } from "@/lib/crud";
import { getSettings } from "@/lib/orders";
import { loadStarterMenu } from "@/lib/seed";
import { onlineProviderReady } from "@/lib/payments";
import { configuredProvider } from "@/lib/ai";

export const GET = handle(async () => {
  const t = await requireTenant(OWNER_ROLES);
  const [restaurant] = await db.select().from(restaurants).where(eq(restaurants.id, t.restaurantId)).limit(1);
  const settings = await getSettings(t.restaurantId);
  const plan = await getLimits(t.restaurantId);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.restaurantId, t.restaurantId)).limit(1);
  const count = async (tbl: typeof branches | typeof tables | typeof menuItems | typeof employees) => {
    const [r] = await db.select({ n: sql<number>`count(*)::int` }).from(tbl).where(eq(tbl.restaurantId, t.restaurantId));
    return r.n;
  };
  return {
    restaurant,
    settings,
    plan,
    subscription: sub ?? null,
    usage: { branches: await count(branches), tables: await count(tables), items: await count(menuItems), employees: await count(employees) },
    role: t.role,
    integrations: { stripe: onlineProviderReady(), ai: configuredProvider() },
  };
});

const COLOR = /^#[0-9a-fA-F]{6}$/;

export const PATCH = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const b = await body<Record<string, unknown>>(req);
  const r: Record<string, unknown> = {};
  const s: Record<string, unknown> = {};
  const str = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  if ("name" in b) {
    r.name = str(b.name, 80);
    if (!r.name) throw new HttpError(400, "Name is required.");
  }
  if ("tagline" in b) r.tagline = str(b.tagline, 120);
  if ("primaryColor" in b) {
    if (!COLOR.test(String(b.primaryColor))) throw new HttpError(400, "Invalid colour.");
    r.primaryColor = b.primaryColor;
  }
  if ("accentColor" in b) {
    if (!COLOR.test(String(b.accentColor))) throw new HttpError(400, "Invalid colour.");
    r.accentColor = b.accentColor;
  }
  if ("theme" in b) {
    if (!["noir", "ember", "ivory"].includes(String(b.theme))) throw new HttpError(400, "Invalid theme.");
    r.theme = b.theme;
  }
  if ("languages" in b && Array.isArray(b.languages)) {
    const l = (b.languages as unknown[]).map(String).filter((x) => ["en", "es", "fr", "hi", "ar", "de"].includes(x));
    if (!l.length) throw new HttpError(400, "Select at least one language.");
    r.languages = l;
    if ("defaultLanguage" in b && l.includes(String(b.defaultLanguage))) r.defaultLanguage = b.defaultLanguage;
    else r.defaultLanguage = l[0];
  }
  for (const k of ["logoAssetId", "coverAssetId"] as const) {
    if (k in b) {
      if (b[k] === null) r[k] = null;
      else {
        if (!isUuid(b[k])) throw new HttpError(400, "Invalid asset.");
        const [a] = await db.select({ id: foodAssets.id }).from(foodAssets).where(and(eq(foodAssets.id, String(b[k])), eq(foodAssets.restaurantId, t.restaurantId))).limit(1);
        if (!a) throw new HttpError(400, "Asset not found.");
        r[k] = b[k];
      }
    }
  }
  const intIn = (k: string, min: number, max: number) => {
    if (k in b) {
      const n = Math.round(Number(b[k]));
      if (!Number.isFinite(n) || n < min || n > max) throw new HttpError(400, `${k} is out of range.`);
      s[k] = n;
    }
  };
  intIn("taxRateBps", 0, 10000);
  intIn("serviceChargeBps", 0, 10000);
  intIn("feeCents", 0, 100000);
  intIn("autoDiscountBps", 0, 9000);
  for (const k of ["taxLabel", "feeLabel", "currency", "timezone", "newOrderSound", "onlineProvider"] as const) if (k in b) s[k] = str(b[k], 40);
  if ("currency" in s) {
    s.currency = String(s.currency).toUpperCase();
    try {
      new Intl.NumberFormat("en", { style: "currency", currency: String(s.currency) });
    } catch {
      throw new HttpError(400, "Unknown currency code.");
    }
  }
  if ("timezone" in s) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: String(s.timezone) });
    } catch {
      throw new HttpError(400, "Unknown timezone.");
    }
  }
  if ("newOrderSound" in s && !["chime", "bell", "pulse", "none"].includes(String(s.newOrderSound))) throw new HttpError(400, "Unknown sound.");
  for (const k of ["orderingEnabled", "soundEnabled", "autoAccept"] as const) if (k in b) s[k] = Boolean(b[k]);
  if ("paymentMethods" in b && b.paymentMethods && typeof b.paymentMethods === "object") {
    const p = b.paymentMethods as Record<string, unknown>;
    s.paymentMethods = { cash: !!p.cash, card_at_table: !!p.card_at_table, online: !!p.online };
    if (!p.cash && !p.card_at_table && !p.online) throw new HttpError(400, "Enable at least one payment method.");
  }
  if (Object.keys(r).length) await db.update(restaurants).set(r).where(eq(restaurants.id, t.restaurantId));
  if (Object.keys(s).length) await db.update(restaurantSettings).set({ ...s, updatedAt: new Date() }).where(eq(restaurantSettings.restaurantId, t.restaurantId));
  return { ok: true };
});

export const POST = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const b = await body<{ action?: string }>(req);
  if (b.action === "starter-menu") {
    await loadStarterMenu(t.restaurantId);
    return { ok: true };
  }
  throw new HttpError(400, "Unknown action.");
});
