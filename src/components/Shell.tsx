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
  const logout = async () => {
    await api("/api/auth/logout", { method: "POST", body: {} });
    router.push("/login");
    router.refresh();
  };
  const links = (
    <nav className="space-y-1" aria-label="Main">
      {nav.map((n) => {
        const active = n.href === path || (n.href.length > 10 && path.startsWith(n.href)) || (n.href === "/dashboard" && path === "/dashboard");
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={() => setOpen(false)}
            aria-current={active ? "page" : undefined}
            className={cx("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-amber-500/15 text-amber-200" : "text-neutral-400 hover:bg-white/5 hover:text-white")}
          >
            <span className="w-5 text-center text-base" aria-hidden>
              {n.icon}
            </span>
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[250px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-white/10 bg-neutral-950 p-5 lg:flex">
        <Link href="/" className="mb-8 block">
          <p className="font-display text-2xl text-white">
            Tap<span className="gold-text">Menu</span> 3D
          </p>
          <p className="mt-0.5 truncate text-xs text-neutral-500">{brand}</p>
        </Link>
        {links}
        <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-xs text-neutral-500">
          <p className="truncate">{user}</p>
          <p className="uppercase tracking-wider text-amber-400/70">{sub}</p>
          <button onClick={logout} className="text-neutral-300 underline-offset-2 hover:underline">
            Sign out
          </button>
        </div>
      </aside>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-neutral-950/90 px-4 py-3 backdrop-blur lg:hidden">
        <p className="font-display text-xl text-white">
          Tap<span className="gold-text">Menu</span> 3D <span className="ml-1 text-xs font-sans text-neutral-500">{brand}</span>
        </p>
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu" className="rounded-lg border border-white/10 px-3 py-1.5 text-sm">
          {open ? "✕" : "☰"}
        </button>
      </header>
      {open && (
        <div className="border-b border-white/10 bg-neutral-950 p-4 lg:hidden">
          {links}
          <button onClick={logout} className="mt-3 text-sm text-neutral-300 underline">
            Sign out
          </button>
        </div>
      )}
      <main className="min-w-0 p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
