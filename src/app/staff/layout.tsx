import { Shell } from "@/components/Shell";
import { guard } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await guard("staff");
  const owner = ["owner", "manager"].includes(s.role!);
  return (
    <Shell
      brand={s.restaurant!.name}
      sub={s.role!}
      user={s.user.email}
      restaurantSlug={s.restaurant!.slug} theme={{ primary: s.restaurant!.primaryColor, accent: s.restaurant!.accentColor }}
      nav={[{ href: "/staff", label: "Floor panel", icon: "🛎" }, ...(owner ? [{ href: "/dashboard", label: "Owner dashboard", icon: "◈" }] : [])]}
    >
      {children}
    </Shell>
  );
}
