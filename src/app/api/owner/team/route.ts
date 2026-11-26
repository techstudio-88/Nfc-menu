import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, restaurantMembers, users } from "@/db/schema";
import { body, handle, HttpError, isUuid } from "@/lib/api";
import { hashPassword, OWNER_ROLES, requireTenant } from "@/lib/auth";
import { addStaff } from "@/lib/seed";

export const GET = handle(async () => {
  const t = await requireTenant(OWNER_ROLES);
  const rows = await db
    .select({
      memberId: restaurantMembers.id,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: restaurantMembers.role,
      active: restaurantMembers.active,
      employeeId: employees.id,
      onDuty: employees.onDuty,
      stationId: employees.stationId,
    })
    .from(restaurantMembers)
    .innerJoin(users, eq(users.id, restaurantMembers.userId))
    .leftJoin(employees, and(eq(employees.userId, users.id), eq(employees.restaurantId, restaurantMembers.restaurantId)))
    .where(eq(restaurantMembers.restaurantId, t.restaurantId));
  return { rows };
});

export const POST = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const b = await body<Record<string, string>>(req);
  const r = await addStaff(t.restaurantId, { name: b.name ?? "", email: b.email ?? "", password: b.password ?? "", role: b.role ?? "waiter" });
  return { id: r.user.id };
});

export const PATCH = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const id = req.nextUrl.searchParams.get("id");
  if (!isUuid(id)) throw new HttpError(400, "Invalid id.");
  const b = await body<Record<string, unknown>>(req);
  const [m] = await db.select().from(restaurantMembers).where(and(eq(restaurantMembers.userId, id), eq(restaurantMembers.restaurantId, t.restaurantId))).limit(1);
  if (!m) throw new HttpError(404, "Member not found.");
  if (m.role === "owner") throw new HttpError(403, "The owner account cannot be modified here.");
  if (m.role === "manager" && t.role !== "owner") throw new HttpError(403, "Only the owner can modify managers.");
  if ("role" in b && ["manager", "kitchen", "waiter"].includes(String(b.role))) {
    if (b.role === "manager" && t.role !== "owner") throw new HttpError(403, "Only the owner can create managers.");
    await db.update(restaurantMembers).set({ role: String(b.role) }).where(eq(restaurantMembers.id, m.id));
    await db.update(employees).set({ title: String(b.role) }).where(and(eq(employees.userId, id), eq(employees.restaurantId, t.restaurantId)));
  }
  if ("active" in b) {
    await db.update(restaurantMembers).set({ active: !!b.active }).where(eq(restaurantMembers.id, m.id));
    await db.update(employees).set({ active: !!b.active }).where(and(eq(employees.userId, id), eq(employees.restaurantId, t.restaurantId)));
  }
  if ("onDuty" in b) await db.update(employees).set({ onDuty: !!b.onDuty }).where(and(eq(employees.userId, id), eq(employees.restaurantId, t.restaurantId)));
  if ("stationId" in b) await db.update(employees).set({ stationId: isUuid(b.stationId) ? b.stationId : null }).where(and(eq(employees.userId, id), eq(employees.restaurantId, t.restaurantId)));
  if (typeof b.password === "string" && b.password) {
    if (b.password.length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
    await db.update(users).set({ passwordHash: hashPassword(b.password) }).where(eq(users.id, id));
  }
  return { ok: true };
});

export const DELETE = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const id = req.nextUrl.searchParams.get("id");
  if (!isUuid(id)) throw new HttpError(400, "Invalid id.");
  const [m] = await db.select().from(restaurantMembers).where(and(eq(restaurantMembers.userId, id), eq(restaurantMembers.restaurantId, t.restaurantId))).limit(1);
  if (!m) throw new HttpError(404, "Member not found.");
  if (m.role === "owner") throw new HttpError(403, "The owner cannot be removed.");
  if (m.role === "manager" && t.role !== "owner") throw new HttpError(403, "Only the owner can remove managers.");
  await db.delete(employees).where(and(eq(employees.userId, id), eq(employees.restaurantId, t.restaurantId)));
  await db.delete(restaurantMembers).where(eq(restaurantMembers.id, m.id));
  // the login itself is removed only if the user belongs to no other workspace
  const others = await db.select({ id: restaurantMembers.id }).from(restaurantMembers).where(eq(restaurantMembers.userId, id)).limit(1);
  if (!others.length) await db.delete(users).where(eq(users.id, id));
  return { ok: true };
});
