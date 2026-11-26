import { and, eq, lt, like } from "drizzle-orm";
import { randomBytes } from "node:crypto";
import { db } from "@/db";
import { users, restaurants, restaurantMembers } from "@/db/schema";
import { body, handle, HttpError } from "@/lib/api";
import { endSession, getSession, hashPassword, homeFor, startSession, verifyPassword } from "@/lib/auth";
import { loadStarterMenu, provisionRestaurant } from "@/lib/seed";

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
    const email = String(b.email ?? "").trim().toLowerCase();
    throttle(`login:${ip}:${email}`);
    const [u] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!u || u.disabled || !verifyPassword(String(b.password ?? ""), u.passwordHash)) throw new HttpError(401, "Incorrect email or password.");
    await startSession(u.id);
    const s = await getSession();
    return { ok: true, home: s ? homeFor(s) : "/dashboard" };
  }
  if (action === "signup") {
    throw new HttpError(403, "Workspace creation is invite-only. Email techstudio7808@gmail.com to request access.");
  }
  if (action === "demo") {
    throttle(`demo:${ip}`);
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const expiredUsers = await db.select({ id: users.id }).from(users).where(and(like(users.email, "demo-%@tapmenu.invalid"), lt(users.createdAt, cutoff)));
    const expiredRestaurants = await db.select({ id: restaurants.id }).from(restaurantMembers).innerJoin(restaurants, eq(restaurants.id, restaurantMembers.restaurantId)).where(and(like(restaurants.slug, "demo-%"), lt(restaurants.createdAt, cutoff)));
    for (const restaurant of expiredRestaurants) await db.delete(restaurants).where(eq(restaurants.id, restaurant.id));
    for (const user of expiredUsers) await db.delete(users).where(eq(users.id, user.id));
    const suffix = randomBytes(8).toString("hex");
    const email = `demo-${suffix}@tapmenu.invalid`;
    const password = randomBytes(32).toString("base64url");
    const [u] = await db.insert(users).values({ email, name: "TapMenu Demo Guest", passwordHash: hashPassword(password) }).returning();
    try {
      const restaurant = await provisionRestaurant({ ownerId: u.id, name: `Demo Restaurant ${suffix.slice(0, 4).toUpperCase()}`, slug: `demo-${suffix}` });
      await loadStarterMenu(restaurant.id);
      await startSession(u.id);
      return { ok: true, home: "/dashboard", demo: true, restaurant: restaurant.name };
    } catch (e) {
      await db.delete(users).where(eq(users.id, u.id));
      throw e;
    }
  }
  throw new HttpError(404, "Not found");
});
