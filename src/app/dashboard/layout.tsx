import { Shell } from "@/components/Shell";
import { guard } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await guard("owner");
  return (
    <Shell
      brand={s.restaurant!.name}
      sub={s.role!}
      user={s.user.email}
      nav={[
        { href: "/dashboard", label: "Overview", icon: "◈" },
        { href: "/dashboard/orders", label: "Live orders", icon: "🔔" },
        { href: "/dashboard/menu", label: "Menu", icon: "🍕" },
        { href: "/dashboard/venues", label: "Tables & NFC", icon: "📍" },
        { href: "/dashboard/team", label: "Team & kitchen", icon: "👥" },
        { href: "/dashboard/reports", label: "Reports", icon: "📈" },
        { href: "/dashboard/inventory", label: "Inventory", icon: "📦" },
        { href: "/dashboard/settings", label: "Settings", icon: "⚙" },
        { href: "/kitchen", label: "Kitchen display ↗", icon: "🍳" },
        { href: "/staff", label: "Floor panel ↗", icon: "🛎" },
      ]}
    >
      {children}
    </Shell>
  );
}
