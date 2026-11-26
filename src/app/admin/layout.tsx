import { Shell } from "@/components/Shell";
import { guard } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  const s = await guard("admin");
  return (
    <Shell brand="Platform" sub="platform admin" user={s.user.email} nav={[{ href: "/admin", label: "Platform console", icon: "◈" }]}>
      {children}
    </Shell>
  );
}
