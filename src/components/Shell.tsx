"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/client";
import { cx } from "@/components/ui";

export type NavItem = { href: string; label: string; icon: string };

export function Shell({ nav, brand, sub, user, children }: { nav: NavItem[]; brand: string; sub: string; user: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isDemo = user.toLowerCase().startsWith("demo-");
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
    router.refresh();
  };
  const links = (
    <nav className="space-y-1.5" aria-label="Main">
      {nav.map((n) => {
        const active = n.href === path || (n.href.length > 10 && path.startsWith(n.href)) || (n.href === "/dashboard" && path === "/dashboard");
        return (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active ? "page" : undefined}
            className={cx("group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition duration-300", active ? "bg-rose-500/15 text-rose-100 shadow-[inset_2px_0_0_#e05265,0_8px_24px_rgba(135,25,45,.12)]" : "text-neutral-400 hover:bg-rose-500/[.07] hover:text-white")}>
            <span className={cx("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border text-base transition", active ? "border-rose-400/25 bg-gradient-to-br from-rose-500/25 to-red-950/60 text-rose-100 shadow-[0_0_18px_rgba(190,45,65,.16)]" : "border-white/[.06] bg-white/[.035] text-neutral-400 group-hover:border-rose-400/20")} aria-hidden>{n.icon}</span>
            <span className="flex-1">{n.label}</span>
            {active && <span className="h-1.5 w-1.5 rounded-full bg-rose-300 shadow-[0_0_10px_rgba(244,114,128,.9)]" />}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="tm-shell min-h-dvh lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-rose-400/10 bg-[#0b080a] p-5 lg:flex">
        <Link href="/" className="mb-8 block">
          <p className="font-display text-2xl tracking-wide text-white">Tap<span className="gold-text">Menu</span> <span className="text-sm text-rose-300">3D</span></p>
          <p className="mt-1 truncate text-xs text-neutral-500">{brand}</p>
          <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-rose-400/15 bg-rose-500/[.06] px-3 py-1 text-[9px] tracking-[.18em] text-rose-200"><span className="h-1.5 w-1.5 rounded-full bg-rose-400 shadow-[0_0_9px_#fb7185]"/> RESTAURANT STUDIO</span>
        </Link>
        {links}
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-xs text-neutral-500">
          <p className="truncate">{user}</p>
          <p className="uppercase tracking-wider text-rose-300/80">{sub}</p>
          <button onClick={logout} className="rounded-lg border border-white/10 px-3 py-2 text-neutral-300 transition hover:border-rose-400/30 hover:bg-rose-500/10 hover:text-white">↪ Sign out</button>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-rose-400/10 bg-[#0b080a]/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div><p className="font-display text-xl text-white">Tap<span className="gold-text">Menu</span> <span className="text-xs text-rose-300">3D</span></p><p className="text-[10px] text-neutral-500">{brand}</p></div>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100">{open ? "✕" : "☰"}</button>
      </header>
      {open && <div className="border-b border-rose-400/10 bg-[#0b080a] p-4 lg:hidden">{links}<button onClick={logout} className="mt-3 rounded-lg px-3 py-2 text-sm text-neutral-300">↪ Sign out</button></div>}
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">
        {isDemo && <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-400/20 bg-gradient-to-r from-rose-950/70 via-[#211014] to-neutral-950 px-4 py-3 shadow-[0_12px_38px_rgba(100,15,32,.12)]">
          <div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-300/20 bg-rose-500/10 text-rose-200">✦</span><div><p className="text-xs font-semibold tracking-[.14em] text-rose-100">DEMO WORKSPACE</p><p className="mt-1 text-[11px] text-white/45">Explore every panel with isolated sample data. Demo sessions expire after 24 hours.</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><Link href="/kitchen" className="rounded-full border border-rose-300/20 px-3 py-2 text-[10px] tracking-wider text-rose-100 hover:bg-rose-500/10">KITCHEN PREVIEW ↗</Link><Link href="/staff" className="rounded-full border border-rose-300/20 px-3 py-2 text-[10px] tracking-wider text-rose-100 hover:bg-rose-500/10">FLOOR PREVIEW ↗</Link><span className="rounded-full border border-rose-300/20 px-3 py-2 text-[10px] tracking-wider text-rose-200">24-HOUR SESSION</span></div>
        </div>}
        {children}
      </main>
    </div>
  );
}
