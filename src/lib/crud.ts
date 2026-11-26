/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomBytes } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { HttpError, isUuid } from "@/lib/api";

type FT = "string" | "int" | "bool" | "json" | "uuid" | "hhmm" | "date";
type Field = { t: FT; req?: boolean; ref?: string; max?: number; min?: number; upper?: boolean; enum?: string[] };
type Res = {
  table: any;
  fields: Record<string, Field>;
  order: any[];
  limit?: "maxBranches" | "maxTables" | "maxMenuItems";
  readonly?: boolean;
  defaults?: () => Record<string, unknown>;
  filters?: string[];
};

const str = (req = false, max = 300): Field => ({ t: "string", req, max });
const int = (min?: number, max?: number): Field => ({ t: "int", min, max });
const bool: Field = { t: "bool" };
const uuid = (ref?: string, req = false): Field => ({ t: "uuid", ref, req });

export const RESOURCES: Record<string, Res> = {
  stations: { table: S.kitchenStations, fields: { name: str(true, 60), sort: int(0, 999), active: bool }, order: [asc(S.kitchenStations.sort), asc(S.kitchenStations.name)] },
  categories: {
    table: S.menuCategories,
    fields: { name: str(true, 80), description: str(false, 300), translations: { t: "json" }, stationId: uuid("stations"), sort: int(0, 9999), active: bool, availableFrom: { t: "hhmm" }, availableTo: { t: "hhmm" } },
    order: [asc(S.menuCategories.sort), asc(S.menuCategories.name)],
  },
  items: {
    table: S.menuItems,
    fields: {
      categoryId: uuid("categories", true),
      name: str(true, 100),
      description: str(false, 600),
      translations: { t: "json" },
      ingredients: { t: "json" },
      basePrice: int(0, 10_000_000),
      imageAssetId: uuid("assets"),
      imageUrl: str(false, 500),
      modelAssetId: uuid("assets"),
      visual: { t: "string", enum: ["pizza", "burger", "pasta", "drink", "dessert", "generic"] },
      stationId: uuid("stations"),
      available: bool,
      featured: bool,
      prepMinutes: int(1, 240),
      availableFrom: { t: "hhmm" },
      availableTo: { t: "hhmm" },
      sort: int(0, 9999),
    },
    order: [asc(S.menuItems.sort), asc(S.menuItems.name)],
    limit: "maxMenuItems",
    filters: ["categoryId"],
  },
  variants: {
    table: S.menuItemVariants,
    fields: { itemId: uuid("items", true), name: str(true, 60), priceDelta: int(-1_000_000, 10_000_000), isDefault: bool, available: bool, sort: int(0, 999) },
    order: [asc(S.menuItemVariants.sort)],
    filters: ["itemId"],
  },
  groups: {
    table: S.customizationGroups,
    fields: {
      name: str(true, 80),
      kind: { t: "string", enum: ["choice", "add", "remove"] },
      minSelect: int(0, 50),
      maxSelect: int(0, 50),
      allowQuantity: bool,
      maxQty: int(1, 20),
      rule: { t: "json" },
      translations: { t: "json" },
      sort: int(0, 999),
    },
    order: [asc(S.customizationGroups.sort), asc(S.customizationGroups.name)],
  },
  options: {
    table: S.customizationOptions,
    fields: {
      groupId: uuid("groups", true),
      name: str(true, 80),
      translations: { t: "json" },
      price: int(-1_000_000, 10_000_000),
      priceBySize: { t: "json" },
      available: bool,
      isDefault: bool,
      layer: str(false, 40),
      sort: int(0, 999),
    },
    order: [asc(S.customizationOptions.sort)],
    filters: ["groupId"],
  },
  itemgroups: {
    table: S.menuItemCustomizationGroups,
    fields: { itemId: uuid("items", true), groupId: uuid("groups", true), sort: int(0, 999) },
    order: [asc(S.menuItemCustomizationGroups.sort)],
    filters: ["itemId", "groupId"],
  },
  branches: {
    table: S.branches,
    fields: { name: str(true, 80), address: str(false, 200), phone: str(false, 40), active: bool },
    order: [asc(S.branches.createdAt)],
    limit: "maxBranches",
  },
  tables: {
    table: S.tables,
    fields: { branchId: uuid("branches", true), code: { t: "string", req: true, max: 20, upper: true }, label: str(false, 60), seats: int(1, 100), active: bool },
    order: [asc(S.tables.code)],
    limit: "maxTables",
  },
  cards: {
    table: S.nfcCards,
    fields: { tableId: uuid("tables"), label: str(false, 60), active: bool },
    order: [asc(S.nfcCards.createdAt)],
    defaults: () => ({ token: randomBytes(6).toString("base64url") }),
  },
  coupons: {
    table: S.coupons,
    fields: {
      code: { t: "string", req: true, max: 30, upper: true },
      kind: { t: "string", enum: ["percent", "fixed"] },
      value: int(1, 10_000_000),
      minSubtotal: int(0, 10_000_000),
      maxUses: int(1, 1_000_000),
      expiresAt: { t: "date" },
      active: bool,
    },
    order: [desc(S.coupons.createdAt)],
  },
  feedback: { table: S.customerFeedback, fields: {}, order: [desc(S.customerFeedback.createdAt)], readonly: true },
  support: { table: S.supportRequests, fields: { subject: str(true, 120), message: str(true, 2000) }, order: [desc(S.supportRequests.createdAt)] },
  assets: { table: S.foodAssets, fields: {}, order: [], readonly: true },
};

export async function getLimits(restaurantId: string) {
  const [r] = await db
    .select({ p: S.subscriptionPlans })
    .from(S.subscriptions)
    .innerJoin(S.subscriptionPlans, eq(S.subscriptionPlans.id, S.subscriptions.planId))
    .where(eq(S.subscriptions.restaurantId, restaurantId))
    .limit(1);
  return r?.p ?? null;
}

export async function checkLimit(restaurantId: string, key: keyof typeof LIMIT_TABLES) {
  const plan = await getLimits(restaurantId);
  if (!plan) return;
  const max = plan[key];
  const tbl = LIMIT_TABLES[key];
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(tbl).where(eq(tbl.restaurantId, restaurantId));
  if (n >= max) throw new HttpError(402, `Your ${plan.name} plan allows up to ${max}. Upgrade your plan to add more.`);
}
const LIMIT_TABLES = { maxBranches: S.branches, maxTables: S.tables, maxMenuItems: S.menuItems, maxEmployees: S.employees } as const;

async function coerce(restaurantId: string, f: Field, v: unknown, name: string): Promise<unknown> {
  if (f.t === "string") {
    let s = String(v ?? "").trim().slice(0, f.max ?? 500);
    if (f.upper) s = s.toUpperCase().replace(/\s+/g, "");
    if (f.req && !s) throw new HttpError(400, `${name} is required.`);
    if (f.enum && !f.enum.includes(s)) throw new HttpError(400, `${name} is invalid.`);
    return s === "" && !f.req && name.toLowerCase().includes("url") ? null : s;
  }
  if (f.t === "int") {
    if (v === null || v === "" || v === undefined) return name === "maxUses" ? null : 0;
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) throw new HttpError(400, `${name} must be a number.`);
    if (f.min !== undefined && n < f.min) throw new HttpError(400, `${name} must be at least ${f.min}.`);
    if (f.max !== undefined && n > f.max) throw new HttpError(400, `${name} must be at most ${f.max}.`);
    return n;
  }
  if (f.t === "bool") return Boolean(v);
  if (f.t === "json") {
    if (v === null || v === undefined) return null;
    if (JSON.stringify(v).length > 20000) throw new HttpError(400, `${name} is too large.`);
    return v;
  }
  if (f.t === "hhmm") {
    if (!v) return null;
    if (!/^\d{2}:\d{2}$/.test(String(v))) throw new HttpError(400, `${name} must be HH:MM.`);
    return String(v);
  }
  if (f.t === "date") {
    if (!v) return null;
    const d = new Date(String(v));
    if (isNaN(d.getTime())) throw new HttpError(400, `${name} is not a valid date.`);
    return d;
  }
  // uuid
  if (v === null || v === "" || v === undefined) {
    if (f.req) throw new HttpError(400, `${name} is required.`);
    return null;
  }
  if (!isUuid(v)) throw new HttpError(400, `${name} is invalid.`);
  if (f.ref) {
    const t = refTable(f.ref);
    const [row] = await db.select({ id: t.id }).from(t).where(and(eq(t.id, v), eq(t.restaurantId, restaurantId))).limit(1);
    if (!row) throw new HttpError(400, `${name} does not belong to your restaurant.`);
  }
  return v;
}

const refTable = (ref: string): any => {
  const m: Record<string, any> = {
    stations: S.kitchenStations,
    categories: S.menuCategories,
    items: S.menuItems,
    groups: S.customizationGroups,
    branches: S.branches,
    tables: S.tables,
    assets: S.foodAssets,
  };
  return m[ref];
};

export function resourceOr404(name: string) {
  const r = RESOURCES[name];
  if (!r) throw new HttpError(404, "Unknown resource.");
  return r;
}

export async function listRows(restaurantId: string, name: string, query: URLSearchParams) {
  const r = resourceOr404(name);
  if (name === "assets") {
    return db
      .select({ id: S.foodAssets.id, kind: S.foodAssets.kind, filename: S.foodAssets.filename, mime: S.foodAssets.mime, size: S.foodAssets.size, createdAt: S.foodAssets.createdAt })
      .from(S.foodAssets)
      .where(eq(S.foodAssets.restaurantId, restaurantId))
      .orderBy(desc(S.foodAssets.createdAt));
  }
  const conds = [eq(r.table.restaurantId, restaurantId)];
  for (const f of r.filters ?? []) {
    const v = query.get(f);
    if (v && isUuid(v)) conds.push(eq(r.table[f], v));
  }
  return db.select().from(r.table).where(and(...conds)).orderBy(...r.order);
}

async function buildData(restaurantId: string, r: Res, data: Record<string, unknown>, partial: boolean) {
  const out: Record<string, unknown> = {};
  for (const [k, f] of Object.entries(r.fields)) {
    if (!(k in data)) {
      if (!partial && f.req) throw new HttpError(400, `${k} is required.`);
      continue;
    }
    out[k] = await coerce(restaurantId, f, data[k], k);
  }
  return out;
}

export async function createRow(restaurantId: string, name: string, data: Record<string, unknown>) {
  const r = resourceOr404(name);
  if (r.readonly) throw new HttpError(405, "Read-only resource.");
  if (r.limit) await checkLimit(restaurantId, r.limit);
  const values = { ...(await buildData(restaurantId, r, data, false)), ...(r.defaults?.() ?? {}), restaurantId };
  const rows = (await db.insert(r.table).values(values as any).returning()) as any[];
  return rows[0];
}

export async function updateRow(restaurantId: string, name: string, id: string, data: Record<string, unknown>) {
  const r = resourceOr404(name);
  if (r.readonly) throw new HttpError(405, "Read-only resource.");
  if (!isUuid(id)) throw new HttpError(400, "Invalid id.");
  const values = await buildData(restaurantId, r, data, true);
  if (!Object.keys(values).length) throw new HttpError(400, "Nothing to update.");
  const rows = (await db.update(r.table).set(values as any).where(and(eq(r.table.id, id), eq(r.table.restaurantId, restaurantId))).returning()) as any[];
  const row = rows[0];
  if (!row) throw new HttpError(404, "Not found.");
  return row;
}

export async function deleteRow(restaurantId: string, name: string, id: string) {
  const r = resourceOr404(name);
  if (r.readonly && name !== "assets") throw new HttpError(405, "Read-only resource.");
  if (!isUuid(id)) throw new HttpError(400, "Invalid id.");
  const rows = (await db.delete(r.table).where(and(eq(r.table.id, id), eq(r.table.restaurantId, restaurantId))).returning({ id: r.table.id })) as any[];
  if (!rows.length) throw new HttpError(404, "Not found.");
  return { ok: true };
}

export { LIMIT_TABLES };
