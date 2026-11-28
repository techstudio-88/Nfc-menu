"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { cx } from "@/components/ui";
import { themeStyle } from "@/lib/theme";

export type NavItem = { href: string; label: string; icon: string };

const isActive = (href: string, path: string) => path === href || (href !== "/dashboard" && path.startsWith(href + "/"));

export function Shell({ nav, brand, sub, user, restaurantSlug, theme, children }: { nav: NavItem[]; brand: string; sub: string; user: string; restaurantSlug?: string; theme?: { primary?: string | null; accent?: string | null }; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isDemo = user.toLowerCase().startsWith("demo-");
  const guest = restaurantSlug ? `/r/${restaurantSlug}?table=T04` : "/";
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
    router.refresh();
  };

  const links = (dark: boolean) => (
    <nav className="space-y-1" aria-label="Main">
      {nav.map((n) => {
        const active = isActive(n.href, path);
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={cx("group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition duration-300",
              dark
                ? active ? "bg-white/10 text-white shadow-[inset_3px_0_0_#f08a96]" : "text-[#e3c1c6] hover:bg-white/[.06] hover:text-white"
                : active ? "bg-brand-soft text-brand-deep shadow-[inset_3px_0_0_#087653]" : "text-mute hover:bg-brand-soft/60 hover:text-ink")}>
            <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-base transition",
              dark ? (active ? "border-[#f08a96]/30 bg-[#f08a96]/15" : "border-white/10 bg-white/5") : (active ? "border-brand/25 bg-surface" : "border-line bg-surface"))} aria-hidden>{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            {active && <span className={cx("h-1.5 w-1.5 rounded-full", dark ? "bg-[#f08a96] shadow-[0_0_10px_#f08a96]" : "bg-brand")} />}
          </Link>
        );
      })}
    </nav>
  );

  const pill = "rounded-full border border-brand/25 bg-surface px-3 py-1.5 text-[10px] font-medium tracking-wider text-brand-deep transition hover:bg-brand hover:text-[#ffffff]";

  return (
    <div className="tm-shell min-h-dvh lg:grid lg:grid-cols-[260px_1fr]" style={themeStyle(theme?.primary, theme?.accent)}>
      <aside className="tm-aside tm-dark sticky top-0 hidden h-dvh flex-col border-r border-white/10 p-5 lg:flex">
        <Link href="/" className="mb-8 block">
          <p className="font-display text-2xl tracking-wide text-white">Tap<span className="gold-text">Menu</span> <span className="text-sm text-white/70">3D</span></p>
          <p className="mt-1 truncate text-xs text-[#c9a1a7]">{brand}</p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[9px] tracking-[.18em] text-[#f4c8cd]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#f08a96] shadow-[0_0_9px_#f08a96]" /> RESTAURANT STUDIO</span>
        </Link>
        {links(true)}
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-xs text-[#c9a1a7]">
          <p className="truncate">{user}</p>
          <p className="uppercase tracking-wider text-[#ef9aa4]">{sub}</p>
          <button onClick={logout} className="rounded-lg border border-white/15 px-3 py-2 text-[#f3dde0] transition hover:border-[#f08a96]/50 hover:bg-white/5 hover:text-white">↪ Sign out</button>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-surface/85 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div>
          <p className="font-display text-xl text-ink">Tap<span className="gold-text">Menu</span> <span className="text-xs text-brand">3D</span></p>
          <p className="text-[10px] text-mute">{brand}</p>
        </div>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink">{open ? "✕" : "☰"}</button>
      </header>
      {open && <div className="border-b border-line bg-surface p-4 lg:hidden">{links(false)}<button onClick={logout} className="mt-3 rounded-lg px-3 py-2 text-sm text-mute">↪ Sign out</button></div>}

      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        {isDemo && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand/20 bg-brand-soft px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-[#ffffff]">✦</span>
              <div>
                <p className="text-xs font-semibold tracking-[.14em] text-brand-deep">DEMO WORKSPACE</p>
                <p className="mt-0.5 text-[11px] text-mute">Explore every panel with isolated sample data. Sessions expire after 24 hours.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/dashboard" className={pill}>OWNER</Link>
              <Link href="/dashboard/menu" className={pill}>MENU</Link>
              <Link href="/dashboard/orders" className={pill}>ORDERS</Link>
              <Link href="/dashboard/venues" className={pill}>TABLES</Link>
              <Link href={guest} className={pill}>GUEST MENU ↗</Link>
              <Link href="/kitchen" className={pill}>KITCHEN</Link>
              <Link href="/staff" className={pill}>FLOOR</Link>
            </div>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
