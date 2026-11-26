import { body, handle, HttpError } from "@/lib/api";
import { db } from "@/db";
import { workspaceAccessRequests } from "@/db/schema";
import { eq } from "drizzle-orm";

const recent = new Map<string, number[]>();
export const dynamic = "force-dynamic";
export const POST = handle(async (req) => {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const now = Date.now();
  const hits = (recent.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (hits.length >= 4) throw new HttpError(429, "Too many requests. Please try again later.");
  recent.set(ip, [...hits, now]);
  const b = await body<Record<string, unknown>>(req);
  const name = String(b.name ?? "").trim().slice(0,100);
  const restaurantName = String(b.restaurantName ?? "").trim().slice(0,120);
  const email = String(b.email ?? "").trim().toLowerCase().slice(0,180);
  if (name.length < 2 || restaurantName.length < 2 || !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Enter your name, restaurant name and a valid email.");
  const [existing] = await db.select({ id: workspaceAccessRequests.id }).from(workspaceAccessRequests).where(eq(workspaceAccessRequests.email,email)).limit(1);
  if (existing) throw new HttpError(409, "A request already exists for this email. Contact techstudio7808@gmail.com if you need an update.");
  await db.insert(workspaceAccessRequests).values({ name, restaurantName, email, phone:String(b.phone??"").slice(0,40), city:String(b.city??"").slice(0,100), message:String(b.message??"").slice(0,1000) });
  return { ok:true };
});
