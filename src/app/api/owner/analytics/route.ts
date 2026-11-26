import { and, desc, eq, gte, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, paymentRecords } from "@/db/schema";
import { handle } from "@/lib/api";
import { OWNER_ROLES, requireTenant } from "@/lib/auth";
import { getSettings } from "@/lib/orders";

export const GET = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES);
  const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 7) || 7));
  const settings = await getSettings(t.restaurantId);
  const tz = settings.timezone;
  const rid = t.restaurantId;
  const todayStart = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz})`;
  const rangeStart = sql`(date_trunc('day', now() at time zone ${tz}) at time zone ${tz}) - ${days - 1} * interval '1 day'`;

  const [today] = await db
    .select({
      orders: sql<number>`count(*) filter (where ${orders.status} <> 'cancelled')::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.status} <> 'cancelled'),0)::int`,
      pending: sql<number>`count(*) filter (where ${orders.status} in ('placed','accepted','preparing','ready','served'))::int`,
      completed: sql<number>`count(*) filter (where ${orders.status} = 'completed')::int`,
      paid: sql<number>`coalesce(sum(${orders.total}) filter (where ${orders.paymentStatus} = 'paid'),0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, rid), gte(orders.createdAt, todayStart as unknown as Date)));

  const trend = await db
    .select({
      day: sql<string>`to_char(${orders.createdAt} at time zone ${tz}, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      count: sql<number>`count(*)::int`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, rid), ne(orders.status, "cancelled"), gte(orders.createdAt, rangeStart as unknown as Date)))
    .groupBy(sql`1`)
    .orderBy(sql`1`);

  const popular = await db
    .select({ name: orderItems.nameSnapshot, qty: sql<number>`sum(${orderItems.quantity})::int`, revenue: sql<number>`sum(${orderItems.lineTotal})::int` })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orderItems.restaurantId, rid), ne(orders.status, "cancelled"), gte(orders.createdAt, rangeStart as unknown as Date)))
    .groupBy(orderItems.nameSnapshot)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(8);

  const [range] = await db
    .select({
      orders: sql<number>`count(*)::int`,
      revenue: sql<number>`coalesce(sum(${orders.total}),0)::int`,
      tax: sql<number>`coalesce(sum(${orders.tax}),0)::int`,
      discount: sql<number>`coalesce(sum(${orders.discount}),0)::int`,
      service: sql<number>`coalesce(sum(${orders.serviceCharge}),0)::int`,
    })
    .from(orders)
    .where(and(eq(orders.restaurantId, rid), ne(orders.status, "cancelled"), gte(orders.createdAt, rangeStart as unknown as Date)));

  const byMethod = await db
    .select({ method: paymentRecords.method, status: paymentRecords.status, amount: sql<number>`sum(${paymentRecords.amount})::int`, n: sql<number>`count(*)::int` })
    .from(paymentRecords)
    .where(and(eq(paymentRecords.restaurantId, rid), gte(paymentRecords.createdAt, rangeStart as unknown as Date)))
    .groupBy(paymentRecords.method, paymentRecords.status);

  const payments = await db
    .select({
      id: paymentRecords.id,
      orderNo: orders.orderNo,
      tableCode: orders.tableCode,
      method: paymentRecords.method,
      provider: paymentRecords.provider,
      amount: paymentRecords.amount,
      currency: paymentRecords.currency,
      status: paymentRecords.status,
      createdAt: paymentRecords.createdAt,
      paidAt: paymentRecords.paidAt,
    })
    .from(paymentRecords)
    .innerJoin(orders, eq(orders.id, paymentRecords.orderId))
    .where(and(eq(paymentRecords.restaurantId, rid), gte(paymentRecords.createdAt, rangeStart as unknown as Date)))
    .orderBy(desc(paymentRecords.createdAt))
    .limit(200);

  return {
    currency: settings.currency,
    days,
    today: { ...today, avgOrder: today.orders ? Math.round(today.revenue / today.orders) : 0 },
    range: { ...range, avgOrder: range.orders ? Math.round(range.revenue / range.orders) : 0 },
    trend,
    popular,
    byMethod,
    payments,
  };
});
