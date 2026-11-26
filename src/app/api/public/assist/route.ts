import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { createAssistance } from "@/lib/orders";

export const POST = handle(async (req) => {
  const b = await body<{ slug: string; tableCode?: string; cardToken?: string; kind?: string; message?: string }>(req);
  const [r] = await db.select({ id: restaurants.id, status: restaurants.status }).from(restaurants).where(eq(restaurants.slug, String(b.slug ?? "").toLowerCase())).limit(1);
  if (!r || r.status !== "active") throw new HttpError(404, "Restaurant not found.");
  const kind = ["waiter", "bill", "water", "help"].includes(String(b.kind)) ? String(b.kind) : "waiter";
  return createAssistance(r.id, b.tableCode ?? "", b.cardToken, kind, String(b.message ?? ""));
});
