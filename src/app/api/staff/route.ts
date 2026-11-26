import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { employees } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { ALL_STAFF, requireTenant } from "@/lib/auth";

export const PATCH = handle(async (req) => {
  const t = await requireTenant(ALL_STAFF, { write: true });
  if (!t.employeeId) throw new HttpError(400, "No employee profile.");
  const b = await body<{ onDuty?: boolean }>(req);
  await db.update(employees).set({ onDuty: !!b.onDuty }).where(and(eq(employees.id, t.employeeId), eq(employees.restaurantId, t.restaurantId)));
  return { ok: true };
});
