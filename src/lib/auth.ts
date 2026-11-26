import { cookies } from "next/headers";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { employees, restaurantMembers, restaurants, users } from "@/db/schema";
import { HttpError } from "@/lib/api";

const COOKIE = "tm_session";
const SECRET = process.env.AUTH_SECRET || process.env.DATABASE_URL + "::tapmenu-dev-secret";
const MAX_AGE = 60 * 60 * 24 * 14;

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  const h = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${h}`;
}

export function verifyPassword(pw: string, stored: string) {
  const [salt, h] = stored.split(":");
  if (!salt || !h) return false;
  const a = Buffer.from(h, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

const sign = (payload: string) => createHmac("sha256", SECRET).update(payload).digest("base64url");

export async function startSession(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export type Session = {
  user: { id: string; email: string; name: string; platformRole: string };
  restaurantId: string | null;
  role: string | null;
  restaurant: { id: string; name: string; slug: string; status: string; theme: string; primaryColor: string; accentColor: string } | null;
  employeeId: string | null;
};

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const parts = raw.split(".");
  if (parts.length !== 3) return null;
  const [uid, exp, sig] = parts;
  const expected = sign(`${uid}.${exp}`);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(exp) < Date.now() / 1000) return null;

  const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  if (!user || user.disabled) return null;
  if (user.email.startsWith("demo-") && Date.now() - user.createdAt.getTime() > 24 * 60 * 60 * 1000) return null;

  const [m] = await db
    .select({
      role: restaurantMembers.role,
      r: restaurants,
    })
    .from(restaurantMembers)
    .innerJoin(restaurants, eq(restaurants.id, restaurantMembers.restaurantId))
    .where(and(eq(restaurantMembers.userId, uid), eq(restaurantMembers.active, true)))
    .limit(1);

  let employeeId: string | null = null;
  if (m) {
    const [emp] = await db
      .select({ id: employees.id, active: employees.active })
      .from(employees)
      .where(and(eq(employees.userId, uid), eq(employees.restaurantId, m.r.id)))
      .limit(1);
    if (emp) {
      if (!emp.active) return null;
      employeeId = emp.id;
    }
  }

  return {
    user: { id: user.id, email: user.email, name: user.name, platformRole: user.platformRole },
    restaurantId: m?.r.id ?? null,
    role: m?.role ?? null,
    restaurant: m
      ? {
          id: m.r.id,
          name: m.r.name,
          slug: m.r.slug,
          status: m.r.status,
          theme: m.r.theme,
          primaryColor: m.r.primaryColor,
          accentColor: m.r.accentColor,
        }
      : null,
    employeeId,
  };
}

export type TenantCtx = Session & { restaurantId: string; role: string; restaurant: NonNullable<Session["restaurant"]> };

/** Require a signed-in member of a restaurant with one of the roles. All tenant queries must use ctx.restaurantId. */
export async function requireTenant(roles: string[], opts: { write?: boolean } = {}): Promise<TenantCtx> {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please sign in.");
  if (!s.restaurantId || !s.role || !s.restaurant) throw new HttpError(403, "No restaurant workspace on this account.");
  if (!roles.includes(s.role)) throw new HttpError(403, "You do not have permission for this action.");
  if (opts.write && s.restaurant.status === "suspended") {
    throw new HttpError(403, "This workspace is suspended. Contact platform support.");
  }
  return s as TenantCtx;
}

export async function requirePlatformAdmin() {
  const s = await getSession();
  if (!s) throw new HttpError(401, "Please sign in.");
  if (s.user.platformRole !== "platform_admin") throw new HttpError(403, "Platform administrators only.");
  return s;
}

export const OWNER_ROLES = ["owner", "manager"];
export const ALL_STAFF = ["owner", "manager", "kitchen", "waiter"];

export function homeFor(s: Session) {
  if (s.user.platformRole === "platform_admin") return "/admin";
  if (s.role === "kitchen") return "/kitchen";
  if (s.role === "waiter") return "/staff";
  return "/dashboard";
}
