import { redirect } from "next/navigation";
import { getSession, homeFor } from "@/lib/auth";

/** Server-side page guard. Redirects to /login or to the user's own home. */
export async function guard(allow: "owner" | "kitchen" | "staff" | "admin") {
  const s = await getSession();
  if (!s) redirect("/login");
  const isAdmin = s.user.platformRole === "platform_admin";
  if (allow === "admin") {
    if (!isAdmin) redirect(homeFor(s));
    return s;
  }
  if (!s.role) redirect(isAdmin ? "/admin" : "/login");
  const ok =
    (allow === "owner" && ["owner", "manager"].includes(s.role)) ||
    (allow === "kitchen" && ["owner", "manager", "kitchen"].includes(s.role)) ||
    (allow === "staff" && ["owner", "manager", "waiter"].includes(s.role));
  if (!ok) redirect(homeFor(s));
  return s;
}
