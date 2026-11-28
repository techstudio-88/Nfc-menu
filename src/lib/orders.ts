import { createHash, randomBytes } from "node:crypto";
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  assistanceRequests,
  coupons,
  customizationGroups,
  customizationOptions,
  employeeAssignments,
  employees,
  kitchenOrderItems,
  kitchenStations,
  inventoryItems,
  menuItemRecipes,
  menuCategories,
  menuItemCustomizationGroups,
  menuItemVariants,
  menuItems,
  nfcCards,
  notifications,
  orderItemCustomizations,
  orderItems,
  orderStatusHistory,
  orders,
  paymentRecords,
  restaurantMembers,
  restaurantSettings,
  restaurants,
  tables,
} from "@/db/schema";
import { HttpError } from "@/lib/api";
import {
  computeTotals,
  nowHHMM,
  resolveItem,
  withinSchedule,
  type GroupDTO,
  type ResolvedLine,
  type Selection,
  type VariantDTO,
} from "@/lib/pricing";
import type { TenantCtx } from "@/lib/auth";

/* ───────────────────────── settings ───────────────────────── */

export async function getSettings(restaurantId: string) {
  const [s] = await db.select().from(restaurantSettings).where(eq(restaurantSettings.restaurantId, restaurantId)).limit(1);
  if (s) return s;
  await db.insert(restaurantSettings).values({ restaurantId }).onConflictDoNothing();
  const [n] = await db.select().from(restaurantSettings).where(eq(restaurantSettings.restaurantId, restaurantId)).limit(1);
  return n;
}

/* ───────────────────────── menu tree ───────────────────────── */

export type MenuItemFull = {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  translations: Record<string, { name?: string; description?: string }>;
  ingredients: string[];
  basePrice: number;
  imageUrl: string | null;
  modelUrl: string | null;
  visual: string;
  available: boolean;
  availableNow: boolean;
  featured: boolean;
  prepMinutes: number;
  stationId: string | null;
  variants: VariantDTO[];
  groups: GroupDTO[];
};

export type MenuTree = {
  categories: {
    id: string;
    name: string;
    description: string;
    translations: Record<string, { name?: string; description?: string }>;
    stationId: string | null;
    availableNow: boolean;
  }[];
  items: MenuItemFull[];
};

const LEGACY_FOOD_PHOTOS: Record<string, string> = {
  pizza: "photo-1513104890138-7c749659a591",
  burger: "photo-1568901346375-23c9450c58cd",
  pasta: "photo-1473093295043-cdd812d0e601",
  coffee: "photo-1509042239860-f550ce710b93",
  dessert: "photo-1578985545062-69928b1d9587",
};
function menuImageUrl(value: string | null, visual: string) {
  if (!value) return null;
  const legacy = value.match(/^\/food\/([^/]+)\.(?:jpe?g|png|webp)$/i);
  if (!legacy) return value;
  const key = legacy[1].toLowerCase();
  const photo = LEGACY_FOOD_PHOTOS[key] ?? LEGACY_FOOD_PHOTOS[visual] ?? LEGACY_FOOD_PHOTOS.dessert;
  return "https://images.unsplash.com/" + photo + "?auto=format&fit=crop&w=1000&q=85";
}

export async function loadMenuTree(restaurantId: string, timezone: string): Promise<MenuTree> {
  const [cats, items, variants, links, groups, options] = await Promise.all([
    db.select().from(menuCategories).where(and(eq(menuCategories.restaurantId, restaurantId), eq(menuCategories.active, true))).orderBy(asc(menuCategories.sort), asc(menuCategories.name)),
    db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId)).orderBy(asc(menuItems.sort), asc(menuItems.name)),
    db.select().from(menuItemVariants).where(eq(menuItemVariants.restaurantId, restaurantId)).orderBy(asc(menuItemVariants.sort)),
    db.select().from(menuItemCustomizationGroups).where(eq(menuItemCustomizationGroups.restaurantId, restaurantId)).orderBy(asc(menuItemCustomizationGroups.sort)),
    db.select().from(customizationGroups).where(eq(customizationGroups.restaurantId, restaurantId)),
    db.select().from(customizationOptions).where(eq(customizationOptions.restaurantId, restaurantId)).orderBy(asc(customizationOptions.sort)),
  ]);
  const now = nowHHMM(timezone);
  const catNow = new Map(cats.map((c) => [c.id, withinSchedule(c.availableFrom, c.availableTo, now)]));
  const optByGroup = new Map<string, typeof options>();
  for (const o of options) optByGroup.set(o.groupId, [...(optByGroup.get(o.groupId) ?? []), o]);
  const groupDto = new Map<string, GroupDTO>(
    groups.map((g) => [
      g.id,
      {
        id: g.id,
        name: g.name,
        kind: g.kind as GroupDTO["kind"],
        minSelect: g.minSelect,
        maxSelect: g.maxSelect,
        allowQuantity: g.allowQuantity,
        maxQty: g.maxQty,
        rule: g.rule ?? null,
        translations: g.translations,
        options: (optByGroup.get(g.id) ?? []).map((o) => ({
          id: o.id,
          name: o.name,
          price: o.price,
          priceBySize: o.priceBySize,
          available: o.available,
          isDefault: o.isDefault,
          layer: o.layer,
          translations: o.translations,
        })),
      },
    ]),
  );
  const out: MenuItemFull[] = items
    .filter((i) => catNow.has(i.categoryId))
    .map((i) => ({
      id: i.id,
      categoryId: i.categoryId,
      name: i.name,
      description: i.description,
      translations: i.translations,
      ingredients: i.ingredients,
      basePrice: i.basePrice,
      imageUrl: i.imageAssetId ? `/api/assets/${i.imageAssetId}` : menuImageUrl(i.imageUrl, i.visual),
      modelUrl: i.modelAssetId ? `/api/assets/${i.modelAssetId}` : null,
      visual: i.visual,
      available: i.available,
      availableNow: i.available && withinSchedule(i.availableFrom, i.availableTo, now) && (catNow.get(i.categoryId) ?? false),
      featured: i.featured,
      prepMinutes: i.prepMinutes,
      stationId: i.stationId,
      variants: variants
        .filter((v) => v.itemId === i.id)
        .map((v) => ({ id: v.id, name: v.name, priceDelta: v.priceDelta, isDefault: v.isDefault, available: v.available })),
      groups: links.filter((l) => l.itemId === i.id).map((l) => groupDto.get(l.groupId)).filter((g): g is GroupDTO => !!g),
    }));
  return {
    categories: cats.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      translations: c.translations,
      stationId: c.stationId,
      availableNow: catNow.get(c.id) ?? true,
    })),
    items: out,
  };
}

/* ───────────────────────── quote & place ───────────────────────── */

export type OrderInput = {
  items: { itemId: string; variantId?: string | null; qty: number; instructions?: string; selections?: Selection[] }[];
  couponCode?: string | null;
  customerKey?: string;
};

export type QuoteLine = {
  itemId: string;
  name: string;
  variantName: string | null;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  instructions: string;
  customizations: ResolvedLine[];
  stationId: string;
  stationName: string;
  errors: string[];
};

async function ensureStations(restaurantId: string) {
  let st = await db.select().from(kitchenStations).where(and(eq(kitchenStations.restaurantId, restaurantId), eq(kitchenStations.active, true))).orderBy(asc(kitchenStations.sort));
  if (!st.length) {
    st = await db.insert(kitchenStations).values({ restaurantId, name: "Kitchen" }).returning();
  }
  return st;
}

export async function quoteOrder(restaurantId: string, input: OrderInput) {
  if (!Array.isArray(input.items) || input.items.length === 0) throw new HttpError(400, "Your cart is empty.");
  if (input.items.length > 40) throw new HttpError(400, "Too many items in one order.");
  const settings = await getSettings(restaurantId);
  const tree = await loadMenuTree(restaurantId, settings.timezone);
  const stations = await ensureStations(restaurantId);
  const catById = new Map(tree.categories.map((c) => [c.id, c]));
  const itemById = new Map(tree.items.map((i) => [i.id, i]));
  const lines: QuoteLine[] = [];
  const errors: string[] = [];
  for (const it of input.items) {
    const item = itemById.get(it.itemId);
    const qty = Math.floor(Number(it.qty));
    if (!item) {
      errors.push("An item in your cart is no longer on the menu.");
      continue;
    }
    if (!Number.isFinite(qty) || qty < 1 || qty > 50) {
      errors.push(`${item.name}: invalid quantity.`);
      continue;
    }
    if (!item.availableNow) {
      errors.push(`${item.name} is currently unavailable.`);
      continue;
    }
    const r = resolveItem(item, it.variantId ?? null, Array.isArray(it.selections) ? it.selections : []);
    const stationId = item.stationId ?? catById.get(item.categoryId)?.stationId ?? stations[0].id;
    const station = stations.find((s) => s.id === stationId) ?? stations[0];
    lines.push({
      itemId: item.id,
      name: item.name,
      variantName: r.variant?.name ?? null,
      unitPrice: r.unitPrice,
      qty,
      lineTotal: r.unitPrice * qty,
      instructions: String(it.instructions ?? "").slice(0, 300),
      customizations: r.lines,
      stationId: station.id,
      stationName: station.name,
      errors: r.errors,
    });
    errors.push(...r.errors.map((e) => `${item.name}: ${e}`));
  }
  const subtotal = lines.reduce((a, l) => a + l.lineTotal, 0);
  let coupon: typeof coupons.$inferSelect | null = null;
  let couponError: string | null = null;
  const code = (input.couponCode ?? "").trim().toUpperCase();
  if (code) {
    const [c] = await db.select().from(coupons).where(and(eq(coupons.restaurantId, restaurantId), eq(coupons.code, code))).limit(1);
    if (!c || !c.active) couponError = "That coupon code is not valid.";
    else if (c.expiresAt && c.expiresAt < new Date()) couponError = "That coupon has expired.";
    else if (c.maxUses !== null && c.usedCount >= c.maxUses) couponError = "That coupon has been fully redeemed.";
    else if (subtotal < c.minSubtotal) couponError = "Your order does not reach the coupon minimum.";
    else coupon = c;
  }
  const totals = computeTotals(subtotal, settings, coupon);
  return { lines, errors, totals, coupon, couponError, settings };
}

const enabledMethods = (s: Awaited<ReturnType<typeof getSettings>>) => {
  const m: string[] = [];
  if (s.paymentMethods.cash) m.push("cash");
  if (s.paymentMethods.card_at_table) m.push("card_at_table");
  if (s.paymentMethods.online) m.push("online");
  return m;
};
export { enabledMethods };

export async function resolveTable(restaurantId: string, tableCode?: string | null, cardToken?: string | null) {
  if (cardToken) {
    const [card] = await db.select().from(nfcCards).where(and(eq(nfcCards.restaurantId, restaurantId), eq(nfcCards.token, cardToken))).limit(1);
    if (card) {
      if (!card.active) return { status: "card_inactive" as const };
      if (card.tableId) {
        const [t] = await db.select().from(tables).where(and(eq(tables.id, card.tableId), eq(tables.restaurantId, restaurantId))).limit(1);
        if (t && t.active) return { status: "ok" as const, table: t };
      }
      return { status: "card_unassigned" as const };
    }
  }
  if (tableCode) {
    const [t] = await db.select().from(tables).where(and(eq(tables.restaurantId, restaurantId), eq(tables.code, tableCode.trim().toUpperCase()))).limit(1);
    if (t && t.active) return { status: "ok" as const, table: t };
    return { status: "unknown_table" as const };
  }
  return { status: "none" as const };
}

export async function placeOrder(
  restaurantId: string,
  input: OrderInput & { tableCode?: string; cardToken?: string; clientKey: string; notes?: string; paymentMethod: string; language?: string },
) {
  const [rest] = await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1);
  if (!rest || rest.status !== "active") throw new HttpError(403, "This restaurant is not accepting orders right now.");
  if (!input.clientKey || input.clientKey.length < 8 || input.clientKey.length > 80) throw new HttpError(400, "Invalid request key.");

  // duplicate protection: the same client key always returns the same order
  const [dup] = await db.select().from(orders).where(and(eq(orders.restaurantId, restaurantId), eq(orders.clientKey, input.clientKey))).limit(1);
  if (dup) return { id: dup.id, token: dup.publicToken, orderNo: dup.orderNo, total: dup.total, status: dup.status, paymentMethod: dup.paymentMethod, duplicate: true };

  const q = await quoteOrder(restaurantId, input);
  if (!q.settings.orderingEnabled) throw new HttpError(403, "Ordering is paused at the moment.");
  if (q.errors.length) throw new HttpError(422, q.errors[0]);
  if (q.couponError) throw new HttpError(422, q.couponError);
  if (!enabledMethods(q.settings).includes(input.paymentMethod)) throw new HttpError(422, "That payment method is not available.");
  if (input.paymentMethod === "online" && !process.env.STRIPE_SECRET_KEY) throw new HttpError(422, "Online payments are not configured yet.");

  const tr = await resolveTable(restaurantId, input.tableCode, input.cardToken);
  if (tr.status === "card_inactive") throw new HttpError(403, "This NFC card has been deactivated.");
  if (tr.status !== "ok") throw new HttpError(422, "Please scan your table's NFC card or enter a valid table number.");
  const table = tr.table;

  const token = randomBytes(9).toString("base64url");
  const guestKey = String(input.customerKey ?? "").trim().slice(0, 128);
  const customerKey = guestKey ? createHash("sha256").update(guestKey).digest("hex") : null;
  const status = q.settings.autoAccept ? "accepted" : "placed";

  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${restaurantId}))`);
    const [{ m }] = await tx.select({ m: sql<number>`coalesce(max(${orders.orderNo}), 100)` }).from(orders).where(eq(orders.restaurantId, restaurantId));
    const orderNo = Number(m) + 1;

    if (q.coupon) {
      const upd = await tx
        .update(coupons)
        .set({ usedCount: sql`${coupons.usedCount} + 1` })
        .where(and(eq(coupons.id, q.coupon.id), sql`(${coupons.maxUses} is null or ${coupons.usedCount} < ${coupons.maxUses})`))
        .returning({ id: coupons.id });
      if (!upd.length) throw new HttpError(409, "That coupon has just been fully redeemed.");
    }

    const [o] = await tx
      .insert(orders)
      .values({
        restaurantId,
        branchId: table.branchId,
        tableId: table.id,
        tableCode: table.code,
        orderNo,
        publicToken: token,
        clientKey: input.clientKey,
        customerKey,
        status,
        subtotal: q.totals.subtotal,
        discount: q.totals.discount,
        tax: q.totals.tax,
        serviceCharge: q.totals.serviceCharge,
        fees: q.totals.fees,
        total: q.totals.total,
        currency: q.settings.currency,
        paymentMethod: input.paymentMethod,
        paymentStatus: "pending",
        couponCode: q.coupon?.code ?? null,
        notes: String(input.notes ?? "").slice(0, 500),
        language: (input.language ?? "en").slice(0, 8),
      })
      .returning();

    for (const l of q.lines) {
      const recipeCosts = await tx.select({ quantity: menuItemRecipes.quantityPerItem, cost: inventoryItems.costPerUnit }).from(menuItemRecipes).innerJoin(inventoryItems, eq(menuItemRecipes.inventoryItemId, inventoryItems.id)).where(and(eq(menuItemRecipes.restaurantId, restaurantId), eq(menuItemRecipes.menuItemId, l.itemId), eq(inventoryItems.active, true)));
      const unitCostSnapshot = recipeCosts.reduce((sum, r) => sum + r.quantity * r.cost, 0);
      const [oi] = await tx
        .insert(orderItems)
        .values({
          orderId: o.id,
          restaurantId,
          menuItemId: l.itemId,
          nameSnapshot: l.name,
          variantNameSnapshot: l.variantName,
          unitPrice: l.unitPrice,
          quantity: l.qty,
          lineTotal: l.lineTotal,
          unitCostSnapshot,
          instructions: l.instructions,
          stationId: l.stationId,
          stationName: l.stationName,
        })
        .returning();
      if (l.customizations.length) {
        await tx.insert(orderItemCustomizations).values(
          l.customizations.map((c) => ({
            orderItemId: oi.id,
            restaurantId,
            optionId: c.optionId,
            groupName: c.groupName,
            optionName: c.optionName,
            action: c.action,
            quantity: c.qty,
            priceDelta: c.priceDelta,
          })),
        );
      }
      await tx.insert(kitchenOrderItems).values({ restaurantId, orderId: o.id, orderItemId: oi.id, stationId: l.stationId, status });
    }

    await tx.insert(orderStatusHistory).values({ orderId: o.id, restaurantId, fromStatus: null, toStatus: "placed", actorName: "customer", note: `Table ${table.code}` });
    if (status !== "placed") await tx.insert(orderStatusHistory).values({ orderId: o.id, restaurantId, fromStatus: "placed", toStatus: status, actorName: "auto-accept" });

    await tx.insert(paymentRecords).values({
      restaurantId,
      orderId: o.id,
      provider: input.paymentMethod === "online" ? q.settings.onlineProvider : "manual",
      method: input.paymentMethod,
      amount: o.total,
      currency: o.currency,
      status: "pending",
    });

    // notifications: owner, each routed station, each on-duty employee (non-kitchen)
    const title = `New order #${o.orderNo} · Table ${table.code}`;
    const body = q.lines.map((l) => `${l.qty}× ${l.name}`).join(", ").slice(0, 200);
    const stationIds = [...new Set(q.lines.map((l) => l.stationId))];
    const emps = await tx
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.restaurantId, restaurantId), eq(employees.active, true), eq(employees.onDuty, true), sql`${employees.title} <> 'kitchen'`));
    await tx.insert(notifications).values([
      { restaurantId, targetType: "owner", type: "order_new", title, body, orderId: o.id },
      ...stationIds.map((sid) => ({ restaurantId, targetType: "station", targetId: sid, type: "order_new", title, body, orderId: o.id })),
      ...emps.map((e) => ({ restaurantId, targetType: "employee", targetId: e.id, type: "order_new", title, body, orderId: o.id })),
    ]);
    return o;
  });

  return { id: created.id, token: created.publicToken, orderNo: created.orderNo, total: created.total, status: created.status, paymentMethod: created.paymentMethod, duplicate: false };
}

/* ───────────────────────── order views ───────────────────────── */

export type OrderView = {
  id: string;
  orderNo: number;
  status: string;
  tableCode: string;
  subtotal: number;
  discount: number;
  tax: number;
  serviceCharge: number;
  fees: number;
  total: number;
  currency: string;
  paymentMethod: string;
  paymentStatus: string;
  couponCode: string | null;
  notes: string;
  aiSummary: string | null;
  priority: boolean;
  publicToken: string;
  createdAt: string;
  updatedAt: string;
  assignedEmployeeId: string | null;
  assignedEmployeeName: string | null;
  items: {
    id: string;
    name: string;
    variantName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    instructions: string;
    stationId: string | null;
    stationName: string;
    customizations: { groupName: string; optionName: string; action: string; quantity: number; priceDelta: number }[];
  }[];
  stations: { stationId: string; stationName: string; status: string; startedAt: string | null; readyAt: string | null }[];
  history: { toStatus: string; actorName: string; note: string; createdAt: string }[];
};

const KIDX: Record<string, number> = { placed: 0, accepted: 1, preparing: 2, ready: 3, completed: 4 };
const IDX_NAME = ["placed", "accepted", "preparing", "ready", "completed"];

export async function loadOrders(
  restaurantId: string,
  f: { ids?: string[]; statuses?: string[]; since?: Date; token?: string; limit?: number } = {},
): Promise<OrderView[]> {
  const conds = [eq(orders.restaurantId, restaurantId)];
  if (f.ids?.length) conds.push(inArray(orders.id, f.ids));
  if (f.statuses?.length) conds.push(inArray(orders.status, f.statuses));
  if (f.since) conds.push(gte(orders.createdAt, f.since));
  if (f.token) conds.push(eq(orders.publicToken, f.token));
  const os = await db.select().from(orders).where(and(...conds)).orderBy(desc(orders.createdAt)).limit(f.limit ?? 150);
  if (!os.length) return [];
  const oids = os.map((o) => o.id);
  const its = await db.select().from(orderItems).where(inArray(orderItems.orderId, oids));
  const [cs, ks, as, hs] = await Promise.all([
    its.length ? db.select().from(orderItemCustomizations).where(inArray(orderItemCustomizations.orderItemId, its.map((i) => i.id))) : Promise.resolve([]),
    db
      .select({
        orderId: kitchenOrderItems.orderId,
        stationId: kitchenOrderItems.stationId,
        status: kitchenOrderItems.status,
        startedAt: kitchenOrderItems.startedAt,
        readyAt: kitchenOrderItems.readyAt,
        stationName: kitchenStations.name,
      })
      .from(kitchenOrderItems)
      .innerJoin(kitchenStations, eq(kitchenStations.id, kitchenOrderItems.stationId))
      .where(inArray(kitchenOrderItems.orderId, oids)),
    db
      .select({ orderId: employeeAssignments.orderId, employeeId: employeeAssignments.employeeId, name: employees.name })
      .from(employeeAssignments)
      .innerJoin(employees, eq(employees.id, employeeAssignments.employeeId))
      .where(inArray(employeeAssignments.orderId, oids)),
    db.select().from(orderStatusHistory).where(inArray(orderStatusHistory.orderId, oids)).orderBy(asc(orderStatusHistory.createdAt)),
  ]);

  return os.map((o) => {
    const stMap = new Map<string, OrderView["stations"][number] & { idx: number }>();
    for (const k of ks.filter((k) => k.orderId === o.id)) {
      const idx = k.status === "cancelled" ? -1 : (KIDX[k.status] ?? 0);
      const cur = stMap.get(k.stationId);
      if (!cur) {
        stMap.set(k.stationId, { stationId: k.stationId, stationName: k.stationName, status: k.status, startedAt: k.startedAt?.toISOString() ?? null, readyAt: k.readyAt?.toISOString() ?? null, idx });
      } else if (idx < cur.idx) {
        cur.idx = idx;
        cur.status = k.status;
      }
    }
    const a = as.find((x) => x.orderId === o.id);
    return {
      id: o.id,
      orderNo: o.orderNo,
      status: o.status,
      tableCode: o.tableCode,
      subtotal: o.subtotal,
      discount: o.discount,
      tax: o.tax,
      serviceCharge: o.serviceCharge,
      fees: o.fees,
      total: o.total,
      currency: o.currency,
      paymentMethod: o.paymentMethod,
      paymentStatus: o.paymentStatus,
      couponCode: o.couponCode,
      notes: o.notes,
      aiSummary: o.aiSummary,
      priority: o.priority,
      publicToken: o.publicToken,
      createdAt: o.createdAt.toISOString(),
      updatedAt: o.updatedAt.toISOString(),
      assignedEmployeeId: a?.employeeId ?? null,
      assignedEmployeeName: a?.name ?? null,
      items: its
        .filter((i) => i.orderId === o.id)
        .map((i) => ({
          id: i.id,
          name: i.nameSnapshot,
          variantName: i.variantNameSnapshot,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.lineTotal,
          instructions: i.instructions,
          stationId: i.stationId,
          stationName: i.stationName,
          customizations: cs
            .filter((c) => c.orderItemId === i.id)
            .map((c) => ({ groupName: c.groupName, optionName: c.optionName, action: c.action, quantity: c.quantity, priceDelta: c.priceDelta })),
        })),
      stations: [...stMap.values()].map(({ idx: _i, ...s }) => {
        void _i;
        return s;
      }),
      history: hs.filter((h) => h.orderId === o.id).map((h) => ({ toStatus: h.toStatus, actorName: h.actorName, note: h.note, createdAt: h.createdAt.toISOString() })),
    };
  });
}

/* ───────────────────────── transitions ───────────────────────── */

const TRANSITIONS: Record<string, string[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "completed"],
  served: ["completed"],
  completed: [],
  cancelled: [],
};
const ROLE_CAN: Record<string, string[]> = {
  owner: ["accepted", "preparing", "ready", "served", "completed", "cancelled"],
  manager: ["accepted", "preparing", "ready", "served", "completed", "cancelled"],
  kitchen: ["accepted", "preparing", "ready", "completed"],
  waiter: ["served", "completed"],
};

async function getOrder(restaurantId: string, orderId: string) {
  const [o] = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId))).limit(1);
  if (!o) throw new HttpError(404, "Order not found.");
  return o;
}

async function notifyReady(restaurantId: string, o: { id: string; orderNo: number; tableCode: string }, extraTitle?: string) {
  const [asg] = await db.select().from(employeeAssignments).where(eq(employeeAssignments.orderId, o.id)).limit(1);
  const title = extraTitle ?? `Order #${o.orderNo} is ready · Table ${o.tableCode}`;
  const rows: (typeof notifications.$inferInsert)[] = [{ restaurantId, targetType: "owner", type: "order_ready", title, orderId: o.id }];
  if (asg) rows.push({ restaurantId, targetType: "employee", targetId: asg.employeeId, type: "order_ready", title, orderId: o.id });
  else {
    const emps = await db
      .select({ id: employees.id })
      .from(employees)
      .where(and(eq(employees.restaurantId, restaurantId), eq(employees.active, true), eq(employees.onDuty, true), sql`${employees.title} <> 'kitchen'`));
    for (const e of emps) rows.push({ restaurantId, targetType: "employee", targetId: e.id, type: "order_ready", title, orderId: o.id });
  }
  await db.insert(notifications).values(rows);
}

export async function changeOrderStatus(ctx: TenantCtx, orderId: string, to: string, note = "") {
  const o = await getOrder(ctx.restaurantId, orderId);
  if (!(TRANSITIONS[o.status] ?? []).includes(to)) throw new HttpError(409, `Cannot move an order from ${o.status} to ${to}.`);
  if (!(ROLE_CAN[ctx.role] ?? []).includes(to)) throw new HttpError(403, "Your role cannot perform this action.");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status: to, updatedAt: now }).where(eq(orders.id, o.id));
    if (to === "cancelled") {
      await tx.update(kitchenOrderItems).set({ status: "cancelled" }).where(eq(kitchenOrderItems.orderId, o.id));
      await tx.update(orders).set({ paymentStatus: sql`case when ${orders.paymentStatus} = 'paid' then 'refunded' else 'failed' end` }).where(eq(orders.id, o.id));
      await tx.update(paymentRecords).set({ status: sql`case when ${paymentRecords.status} = 'paid' then 'refunded' else 'failed' end` }).where(eq(paymentRecords.orderId, o.id));
    } else {
      const target = to === "served" || to === "completed" ? "completed" : to;
      const upd: Record<string, unknown> = { status: target };
      if (target === "preparing") upd.startedAt = now;
      if (target === "ready" || target === "completed") upd.readyAt = now;
      await tx
        .update(kitchenOrderItems)
        .set(upd)
        .where(and(eq(kitchenOrderItems.orderId, o.id), sql`${kitchenOrderItems.status} <> 'cancelled'`, sql`case ${kitchenOrderItems.status} when 'placed' then 0 when 'accepted' then 1 when 'preparing' then 2 when 'ready' then 3 else 4 end < ${KIDX[target] ?? 0}`));
    }
    await tx.insert(orderStatusHistory).values({ orderId: o.id, restaurantId: ctx.restaurantId, fromStatus: o.status, toStatus: to, actorName: ctx.user.name, note });
    if (to === "completed" && o.paymentStatus === "pending" && o.paymentMethod !== "online") {
      await tx.update(orders).set({ paymentStatus: "paid" }).where(eq(orders.id, o.id));
      await tx.update(paymentRecords).set({ status: "paid", paidAt: now }).where(and(eq(paymentRecords.orderId, o.id), eq(paymentRecords.status, "pending")));
    }
  });
  if (to === "ready") await notifyReady(ctx.restaurantId, o);
  if (to === "cancelled") {
    await db.insert(notifications).values({ restaurantId: ctx.restaurantId, targetType: "owner", type: "order_status", title: `Order #${o.orderNo} cancelled`, orderId: o.id });
  }
  return { ok: true };
}

export async function changeStationStatus(ctx: TenantCtx, orderId: string, stationId: string, to: string) {
  if (!["accepted", "preparing", "ready"].includes(to)) throw new HttpError(400, "Invalid station status.");
  if (!["owner", "manager", "kitchen"].includes(ctx.role)) throw new HttpError(403, "Kitchen staff only.");
  const o = await getOrder(ctx.restaurantId, orderId);
  if (!["placed", "accepted", "preparing"].includes(o.status)) throw new HttpError(409, "This order is no longer in the kitchen.");
  const [st] = await db.select().from(kitchenStations).where(and(eq(kitchenStations.id, stationId), eq(kitchenStations.restaurantId, ctx.restaurantId))).limit(1);
  if (!st) throw new HttpError(404, "Station not found.");
  const now = new Date();
  const target = KIDX[to];
  const upd: Record<string, unknown> = { status: to };
  if (to === "preparing") upd.startedAt = now;
  if (to === "ready") upd.readyAt = now;
  const rows = await db
    .update(kitchenOrderItems)
    .set(upd)
    .where(and(eq(kitchenOrderItems.orderId, o.id), eq(kitchenOrderItems.stationId, stationId), sql`${kitchenOrderItems.status} <> 'cancelled'`, sql`case ${kitchenOrderItems.status} when 'placed' then 0 when 'accepted' then 1 when 'preparing' then 2 when 'ready' then 3 else 4 end < ${target}`))
    .returning({ id: kitchenOrderItems.id });
  if (!rows.length) return { ok: true, status: o.status };

  const all = await db.select({ status: kitchenOrderItems.status }).from(kitchenOrderItems).where(and(eq(kitchenOrderItems.orderId, o.id), sql`${kitchenOrderItems.status} <> 'cancelled'`));
  const mn = Math.min(...all.map((a) => KIDX[a.status] ?? 0));
  const mx = Math.max(...all.map((a) => KIDX[a.status] ?? 0));
  let derived = "placed";
  if (mn >= 3) derived = "ready";
  else if (mx >= 2) derived = "preparing";
  else if (mx >= 1) derived = "accepted";
  const cur = KIDX[o.status] ?? 0;
  const dIdx = KIDX[derived];
  await db.insert(orderStatusHistory).values({ orderId: o.id, restaurantId: ctx.restaurantId, fromStatus: o.status, toStatus: dIdx > cur ? derived : o.status, actorName: ctx.user.name, note: `${st.name}: ${to}` });
  if (dIdx > cur) {
    await db.update(orders).set({ status: derived, updatedAt: now }).where(eq(orders.id, o.id));
    if (derived === "ready") await notifyReady(ctx.restaurantId, o);
  }
  return { ok: true, status: dIdx > cur ? derived : o.status, derived: IDX_NAME[dIdx] };
}

export async function assignOrder(ctx: TenantCtx, orderId: string, employeeId: string | null) {
  const o = await getOrder(ctx.restaurantId, orderId);
  if (ctx.role === "waiter") {
    if (employeeId !== ctx.employeeId && employeeId !== null) throw new HttpError(403, "You can only assign orders to yourself.");
  } else if (!["owner", "manager"].includes(ctx.role)) throw new HttpError(403, "Not allowed.");
  if (employeeId === null) {
    await db.delete(employeeAssignments).where(eq(employeeAssignments.orderId, o.id));
    return { ok: true };
  }
  const [e] = await db.select().from(employees).where(and(eq(employees.id, employeeId), eq(employees.restaurantId, ctx.restaurantId), eq(employees.active, true))).limit(1);
  if (!e) throw new HttpError(404, "Employee not found.");
  await db
    .insert(employeeAssignments)
    .values({ restaurantId: ctx.restaurantId, orderId: o.id, employeeId })
    .onConflictDoUpdate({ target: employeeAssignments.orderId, set: { employeeId } });
  await db.insert(orderStatusHistory).values({ orderId: o.id, restaurantId: ctx.restaurantId, fromStatus: o.status, toStatus: o.status, actorName: ctx.user.name, note: `Assigned to ${e.name}` });
  if (employeeId !== ctx.employeeId) {
    await db.insert(notifications).values({ restaurantId: ctx.restaurantId, targetType: "employee", targetId: employeeId, type: "order_assigned", title: `Order #${o.orderNo} assigned to you · Table ${o.tableCode}`, orderId: o.id });
  }
  return { ok: true };
}

export async function markPaid(ctx: TenantCtx, orderId: string) {
  if (!["owner", "manager", "waiter"].includes(ctx.role)) throw new HttpError(403, "Not allowed.");
  const o = await getOrder(ctx.restaurantId, orderId);
  if (o.status === "cancelled") throw new HttpError(409, "Order is cancelled.");
  await db.update(orders).set({ paymentStatus: "paid", updatedAt: new Date() }).where(eq(orders.id, o.id));
  await db.update(paymentRecords).set({ status: "paid", paidAt: new Date() }).where(and(eq(paymentRecords.orderId, o.id), eq(paymentRecords.status, "pending")));
  await db.insert(orderStatusHistory).values({ orderId: o.id, restaurantId: ctx.restaurantId, fromStatus: o.status, toStatus: o.status, actorName: ctx.user.name, note: "Payment received" });
  return { ok: true };
}

export async function createAssistance(restaurantId: string, tableCode: string, cardToken: string | undefined, kind: string, message: string) {
  const tr = await resolveTable(restaurantId, tableCode, cardToken);
  if (tr.status !== "ok") throw new HttpError(422, "Table not recognised.");
  const [open] = await db
    .select({ id: assistanceRequests.id })
    .from(assistanceRequests)
    .where(and(eq(assistanceRequests.restaurantId, restaurantId), eq(assistanceRequests.tableId, tr.table.id), eq(assistanceRequests.status, "open"), eq(assistanceRequests.kind, kind)))
    .limit(1);
  if (open) return { ok: true, duplicate: true };
  const [a] = await db.insert(assistanceRequests).values({ restaurantId, tableId: tr.table.id, tableCode: tr.table.code, kind, message: message.slice(0, 200) }).returning();
  const label = kind === "bill" ? "requested the bill" : kind === "payment" ? "is ready to pay" : kind === "water" ? "needs water" : kind === "waiter" ? "called a waiter" : "needs assistance";
  const title = `Table ${tr.table.code} ${label}`;
  const emps = await db
    .select({ id: employees.id })
    .from(employees)
    .where(and(eq(employees.restaurantId, restaurantId), eq(employees.active, true), eq(employees.onDuty, true), sql`${employees.title} <> 'kitchen'`));
  await db.insert(notifications).values([
    { restaurantId, targetType: "owner", type: "assist", title, body: message.slice(0, 200) },
    ...emps.map((e) => ({ restaurantId, targetType: "employee", targetId: e.id, type: "assist", title, body: message.slice(0, 200) })),
  ]);
  return { ok: true, id: a.id };
}

export async function activeEmployees(restaurantId: string) {
  return db
    .select({ id: employees.id, name: employees.name, title: employees.title, onDuty: employees.onDuty })
    .from(employees)
    .innerJoin(restaurantMembers, and(eq(restaurantMembers.userId, employees.userId), eq(restaurantMembers.restaurantId, employees.restaurantId)))
    .where(and(eq(employees.restaurantId, restaurantId), eq(employees.active, true), eq(restaurantMembers.active, true)));
}
