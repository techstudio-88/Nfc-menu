import { Shell } from "@/components/Shell";
import { guard } from "@/lib/guard";
export const dynamic = "force-dynamic";
export default async function Layout({ children }: { children: React.ReactNode }) {
 const s = await guard("kitchen"); const owner = ["owner", "manager"].includes(s.role!);
 return <Shell brand={s.restaurant!.name} sub={s.role!} user={s.user.email} restaurantSlug={s.restaurant!.slug} theme={{ primary: s.restaurant!.primaryColor, accent: s.restaurant!.accentColor }} nav={[{ href: "/kitchen", label: "Kitchen display", icon: "🍳" }, ...(owner ? [{ href: "/dashboard", label: "Owner dashboard", icon: "◈" }, { href: "/dashboard/menu", label: "Menu", icon: "🍽" }, { href: "/dashboard/orders", label: "Live orders", icon: "🔔" }, { href: "/staff", label: "Floor panel", icon: "🛎" }] : [])]}>{children}</Shell>;
}
