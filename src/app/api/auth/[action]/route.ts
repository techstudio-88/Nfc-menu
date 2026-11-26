import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { endSession, getSession, hashPassword, homeFor, startSession, verifyPassword } from "@/lib/auth";
import { ensureDemo, provisionRestaurant } from "@/lib/seed";

const attempts = new Map<string, { n: number; reset: number }>();
function throttle(key: string) {
  const now = Date.now();
  const a = attempts.get(key);
  if (!a || a.reset < now) {
    attempts.set(key, { n: 1, reset: now + 10 * 60_000 });
    return;
  }
  a.n++;
  if (a.n > 10) throw new HttpError(429, "Too many attempts. Please wait a few minutes.");
}

export const GET = handle(async (_req, ctx) => {
  const { action } = await ctx.params;
  if (action !== "me") throw new HttpError(404, "Not found");
  const s = await getSession();
  if (!s) return { user: null };
  return { user: s.user, role: s.role, restaurant: s.restaurant, employeeId: s.employeeId, home: homeFor(s) };
});

export const POST = handle(async (req, ctx) => {
  const { action } = await ctx.params;
  if (action === "logout") {
    await endSession();
    return { ok: true };
  }
  const b = await body<Record<string, string>>(req);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "local";
  if (action === "login") {
    await ensureDemo();
    const email = String(b.email ?? "").trim().toLowerCase();
    throttle(`login:${ip}:${email}`);
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!u || u.disabled || !verifyPassword(String(b.password ?? ""), u.passwordHash)) throw new HttpError(401, "Incorrect email or password.");
    await startSession(u.id);
    const s = await getSession();
    return { ok: true, home: s ? homeFor(s) : "/dashboard" };
  }
  if (action === "signup") {
    throttle(`signup:${ip}`);
    const email = String(b.email ?? "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, "Enter a valid email address.");
    if (String(b.password ?? "").length < 8) throw new HttpError(400, "Password must be at least 8 characters.");
    if (!String(b.restaurantName ?? "").trim()) throw new HttpError(400, "Restaurant name is required.");
    const [ex] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (ex) throw new HttpError(409, "An account with that email already exists.");
    const [u] = await db
      .insert(users)
      .values({ email, name: String(b.name ?? "").trim() || email, passwordHash: hashPassword(b.password) })
      .returning();
    try {
      const slug = b.slug || b.restaurantName;
      const r = await provisionRestaurant({ ownerId: u.id, name: b.restaurantName.trim(), slug });
      await startSession(u.id);
      return { ok: true, home: "/dashboard", slug: r.slug };
    } catch (e) {
      await db.delete(users).where(eq(users.id, u.id));
      throw e;
    }
  }
  throw new HttpError(404, "Not found");
});
