import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, kitchenStations } from "@/db/schema";
import { handle } from "@/lib/api";
import { ALL_STAFF, requireTenant } from "@/lib/auth";
import { activeEmployees, loadOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => {
  const t = await requireTenant(ALL_STAFF);
  const sp = req.nextUrl.searchParams;
  const view = sp.get("view") ?? "active"; // active | history | all
  const statuses = view === "active" ? ["placed", "accepted", "preparing", "ready", "served"] : view === "history" ? ["completed", "cancelled"] : undefined;
  const days = Math.min(90, Number(sp.get("days") ?? 30) || 30);
  let list = await loadOrders(t.restaurantId, { statuses, since: view === "active" ? undefined : new Date(Date.now() - days * 864e5), limit: Math.min(300, Number(sp.get("limit") ?? 150) || 150) });
  if (sp.get("mine") === "1" && t.employeeId) list = list.filter((o) => o.assignedEmployeeId === t.employeeId);
  const stations = await db.select().from(kitchenStations).where(and(eq(kitchenStations.restaurantId, t.restaurantId), eq(kitchenStations.active, true)));
  let me: { id: string; stationId: string | null; onDuty: boolean } | null = null;
  if (t.employeeId) {
    const [e] = await db.select({ id: employees.id, stationId: employees.stationId, onDuty: employees.onDuty }).from(employees).where(eq(employees.id, t.employeeId)).limit(1);
    me = e ?? null;
  }
  return { orders: list, stations, employees: t.role === "kitchen" ? [] : await activeEmployees(t.restaurantId), me, role: t.role, restaurantName: t.restaurant.name };
});
