import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import * as S from "@/db/schema";
import { body, handle, HttpError, isUuid } from "@/lib/api";
import { hashPassword, requirePlatformAdmin } from "@/lib/auth";
import { loadStarterMenu, provisionRestaurant } from "@/lib/seed";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  await requirePlatformAdmin();
  const r = req.nextUrl.searchParams.get("r") ?? "overview";
  if (r === "overview") {
    const [rest] = await db.select({ total: sql<number>`count(*)::int`, active: sql<number>`count(*) filter (where ${S.restaurants.status}='active')::int`, suspended: sql<number>`count(*) filter (where ${S.restaurants.status}='suspended')::int` }).from(S.restaurants);
    const [ord] = await db.select({ orders: sql<number>`count(*) filter (where ${S.orders.status}<>'cancelled')::int`, gmv: sql<number>`coalesce(sum(${S.orders.total}) filter (where ${S.orders.paymentStatus}='paid'),0)::bigint::float` }).from(S.orders);
    const [mrr] = await db
      .select({ mrr: sql<number>`coalesce(sum(${S.subscriptionPlans.priceCents}) filter (where ${S.subscriptions.status}='active'),0)::int`, trialing: sql<number>`count(*) filter (where ${S.subscriptions.status}='trialing')::int`, active: sql<number>`count(*) filter (where ${S.subscriptions.status}='active')::int` })
      .from(S.subscriptions)
      .innerJoin(S.subscriptionPlans, eq(S.subscriptionPlans.id, S.subscriptions.planId));
    const signups = await db.select({ day: sql<string>`to_char(${S.restaurants.createdAt},'YYYY-MM-DD')`, n: sql<number>`count(*)::int` }).from(S.restaurants).where(sql`${S.restaurants.createdAt} > now() - interval '30 days'`).groupBy(sql`1`).orderBy(sql`1`);
    const ordersTrend = await db.select({ day: sql<string>`to_char(${S.orders.createdAt},'YYYY-MM-DD')`, n: sql<number>`count(*)::int`, gmv: sql<number>`coalesce(sum(${S.orders.total}),0)::int` }).from(S.orders).where(sql`${S.orders.createdAt} > now() - interval '14 days'`).groupBy(sql`1`).orderBy(sql`1`);
    const [sup] = await db.select({ open: sql<number>`count(*) filter (where ${S.supportRequests.status}='open')::int` }).from(S.supportRequests);
    return { restaurants: rest, orders: ord, subscriptions: mrr, signups, ordersTrend, openSupport: sup.open };
  }
  if (r === "restaurants") {
    const rows = await db
      .select({
        id: S.restaurants.id,
        name: S.restaurants.name,
        slug: S.restaurants.slug,
        status: S.restaurants.status,
        createdAt: S.restaurants.createdAt,
        planId: S.subscriptions.planId,
        planName: S.subscriptionPlans.name,
        subStatus: S.subscriptions.status,
        periodEnd: S.subscriptions.currentPeriodEnd,
        branches: sql<number>`(select count(*) from branches b where b.restaurant_id = ${S.restaurants.id})::int`,
        tables: sql<number>`(select count(*) from tables t where t.restaurant_id = ${S.restaurants.id})::int`,
        items: sql<number>`(select count(*) from menu_items m where m.restaurant_id = ${S.restaurants.id})::int`,
        employees: sql<number>`(select count(*) from employees e where e.restaurant_id = ${S.restaurants.id})::int`,
        orders30: sql<number>`(select count(*) from orders o where o.restaurant_id = ${S.restaurants.id} and o.created_at > now() - interval '30 days')::int`,
        revenue30: sql<number>`(select coalesce(sum(total),0) from orders o where o.restaurant_id = ${S.restaurants.id} and o.status <> 'cancelled' and o.created_at > now() - interval '30 days')::int`,
        owner: sql<string>`(select u.email from restaurant_members m join users u on u.id = m.user_id where m.restaurant_id = ${S.restaurants.id} and m.role = 'owner' limit 1)`,
      })
      .from(S.restaurants)
      .leftJoin(S.subscriptions, eq(S.subscriptions.restaurantId, S.restaurants.id))
      .leftJoin(S.subscriptionPlans, eq(S.subscriptionPlans.id, S.subscriptions.planId))
      .orderBy(desc(S.restaurants.createdAt));
    return { rows };
  }
  if (r === "plans") return { rows: await db.select().from(S.subscriptionPlans).orderBy(S.subscriptionPlans.priceCents) };
  if (r === "accessRequests") return { rows: await db.select().from(S.workspaceAccessRequests).orderBy(desc(S.workspaceAccessRequests.createdAt)).limit(200) };
  if (r === "support") {
    const rows = await db
      .select({ id: S.supportRequests.id, subject: S.supportRequests.subject, message: S.supportRequests.message, status: S.supportRequests.status, reply: S.supportRequests.reply, createdAt: S.supportRequests.createdAt, restaurant: S.restaurants.name })
      .from(S.supportRequests)
      .innerJoin(S.restaurants, eq(S.restaurants.id, S.supportRequests.restaurantId))
      .orderBy(desc(S.supportRequests.createdAt))
      .limit(100);
    return { rows };
  }
  if (r === "payments") {
    const rows = await db
      .select({ id: S.paymentRecords.id, restaurant: S.restaurants.name, orderNo: S.orders.orderNo, method: S.paymentRecords.method, provider: S.paymentRecords.provider, amount: S.paymentRecords.amount, currency: S.paymentRecords.currency, status: S.paymentRecords.status, createdAt: S.paymentRecords.createdAt })
      .from(S.paymentRecords)
      .innerJoin(S.restaurants, eq(S.restaurants.id, S.paymentRecords.restaurantId))
      .innerJoin(S.orders, eq(S.orders.id, S.paymentRecords.orderId))
      .orderBy(desc(S.paymentRecords.createdAt))
      .limit(200);
    return { rows };
  }
  if (r === "config") {
    const rows = await db.select().from(S.platformConfig);
    return { rows };
  }
  throw new HttpError(400, "Unknown view.");
});

export const POST = handle(async (req) => {
  await requirePlatformAdmin();
  const b = await body<Record<string, unknown>>(req);
  const rid = b.restaurantId;
  switch (b.action) {
    case "reviewAccessRequest": {
      if (!isUuid(b.id)) throw new HttpError(400, "Invalid access request.");
      const [request] = await db.select().from(S.workspaceAccessRequests).where(eq(S.workspaceAccessRequests.id, b.id)).limit(1);
      if (!request) throw new HttpError(404, "Access request not found.");
      if (request.status !== "pending") throw new HttpError(409, "This request has already been reviewed.");
      const status = String(b.status);
      if (status === "rejected") {
        await db.update(S.workspaceAccessRequests).set({ status: "rejected", adminNote: String(b.adminNote ?? "").slice(0,1000), reviewedAt: new Date() }).where(eq(S.workspaceAccessRequests.id, request.id));
        return { ok: true };
      }
      if (status !== "approved") throw new HttpError(400, "Choose approve or reject.");
      const password = String(b.temporaryPassword ?? "");
      if (password.length < 10) throw new HttpError(400, "Set a temporary password of at least 10 characters.");
      const email = request.email.trim().toLowerCase();
      const [existing] = await db.select({ id: S.users.id }).from(S.users).where(eq(S.users.email, email)).limit(1);
      if (existing) throw new HttpError(409, "An account already exists for this email. Use the existing login or a different email.");
      const [u] = await db.insert(S.users).values({ email, name: request.name, passwordHash: hashPassword(password) }).returning();
      let createdRestaurantId: string | null = null;
      try {
        const slug = String(b.slug ?? request.restaurantName).trim();
        const restaurant = await provisionRestaurant({ ownerId: u.id, name: request.restaurantName, slug });
        createdRestaurantId = restaurant.id;
        await loadStarterMenu(restaurant.id);
        await db.update(S.workspaceAccessRequests).set({ status: "approved", adminNote: String(b.adminNote ?? "").slice(0,1000), reviewedAt: new Date() }).where(eq(S.workspaceAccessRequests.id, request.id));
        return { ok: true, email, restaurantSlug: restaurant.slug };
      } catch (error) {
        if (createdRestaurantId) await db.delete(S.restaurants).where(eq(S.restaurants.id, createdRestaurantId));
        await db.delete(S.users).where(eq(S.users.id, u.id));
        throw error;
      }
    }
    case "setStatus": {
      if (!isUuid(rid) || !["active", "suspended"].includes(String(b.status))) throw new HttpError(400, "Invalid request.");
      await db.update(S.restaurants).set({ status: String(b.status) }).where(eq(S.restaurants.id, rid));
      return { ok: true };
    }
    case "setPlan": {
      if (!isUuid(rid) || !isUuid(b.planId)) throw new HttpError(400, "Invalid request.");
      const status = ["trialing", "active", "past_due", "canceled"].includes(String(b.status)) ? String(b.status) : "active";
      const end = new Date(Date.now() + 30 * 864e5);
      await db
        .insert(S.subscriptions)
        .values({ restaurantId: rid, planId: b.planId, status, currentPeriodEnd: end })
        .onConflictDoUpdate({ target: S.subscriptions.restaurantId, set: { planId: b.planId, status, currentPeriodEnd: end } });
      return { ok: true };
    }
    case "savePlan": {
      const v = {
        code: String(b.code ?? "").trim().toLowerCase(),
        name: String(b.name ?? "").trim(),
        priceCents: Math.max(0, Math.round(Number(b.priceCents) || 0)),
        maxBranches: Math.max(1, Math.round(Number(b.maxBranches) || 1)),
        maxTables: Math.max(1, Math.round(Number(b.maxTables) || 1)),
        maxMenuItems: Math.max(1, Math.round(Number(b.maxMenuItems) || 1)),
        maxEmployees: Math.max(1, Math.round(Number(b.maxEmployees) || 1)),
        active: b.active !== false,
      };
      if (!v.code || !v.name) throw new HttpError(400, "Code and name are required.");
      if (isUuid(b.id)) await db.update(S.subscriptionPlans).set(v).where(eq(S.subscriptionPlans.id, b.id));
      else await db.insert(S.subscriptionPlans).values(v);
      return { ok: true };
    }
    case "replySupport": {
      if (!isUuid(b.id)) throw new HttpError(400, "Invalid request.");
      await db
        .update(S.supportRequests)
        .set({ reply: String(b.reply ?? "").slice(0, 2000), status: ["answered", "closed", "open"].includes(String(b.status)) ? String(b.status) : "answered" })
        .where(eq(S.supportRequests.id, b.id));
      return { ok: true };
    }
    case "setConfig": {
      const key = String(b.key ?? "").slice(0, 60);
      if (!key) throw new HttpError(400, "Key required.");
      await db
        .insert(S.platformConfig)
        .values({ key, value: b.value ?? "" })
        .onConflictDoUpdate({ target: S.platformConfig.key, set: { value: b.value ?? "", updatedAt: new Date() } });
      return { ok: true };
    }
    default:
      throw new HttpError(400, "Unknown action.");
  }
});
