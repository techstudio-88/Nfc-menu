import { randomUUID } from "node:crypto";
import { body, handle, HttpError } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { CHANNELS, ensureVirtualTable } from "@/lib/channels";
import { enabledMethods, getSettings, markPaid, placeOrder, type OrderInput } from "@/lib/orders";

/** Staff / owner counter ordering (POS). Prices and totals are recomputed server-side. */
export const POST = handle(async (req) => {
  const t = await requireTenant(["owner", "manager", "waiter"], { write: true });
  const b = await body<OrderInput & { tableCode: string; notes?: string; paymentMethod?: string; collect?: boolean; customerName?: string }>(req);
  if (!b.items?.length) throw new HttpError(422, "Add at least one item.");
  let tableCode = String(b.tableCode ?? "").trim().toUpperCase();
  if (!tableCode) throw new HttpError(422, "Choose a table, takeaway or delivery.");
  if (CHANNELS[tableCode]) tableCode = await ensureVirtualTable(t.restaurantId, tableCode);
  const settings = await getSettings(t.restaurantId);
  const methods = enabledMethods(settings);
  const paymentMethod = b.paymentMethod && methods.includes(b.paymentMethod) ? b.paymentMethod : methods[0] ?? "cash";
  const placed = await placeOrder(t.restaurantId, {
    items: b.items,
    couponCode: b.couponCode,
    tableCode,
    clientKey: `pos-${randomUUID()}`,
    notes: `${b.customerName ? b.customerName + " · " : ""}${b.notes ?? ""}`.slice(0, 500),
    paymentMethod,
  });
  if (b.collect) await markPaid(t, placed.id);
  return { ok: true, id: placed.id, orderNo: placed.orderNo, total: placed.total };
});
