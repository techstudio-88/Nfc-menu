import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { ensureDemo, ensurePlans } from "@/lib/seed";
import { formatMoney } from "@/lib/pricing";
import Hero3D from "@/components/landing/Hero3D";

export const dynamic = "force-dynamic";

const EXPERIENCES = [
  { n: "01", t: "The guest", d: "Taps an NFC card. The menu opens in your brand — no app, no sign-up. Dishes rotate in 3D, build-your-own pizza updates live, and AR puts it on the table.", c: "Customer menu" },
  { n: "02", t: "The owner", d: "Menu, prices, tax, tables, NFC cards, coupons, analytics and live orders — with a voice readout and AI summary of every ticket.", c: "Owner dashboard" },
  { n: "03", t: "The kitchen", d: "A tablet display that routes each dish to its station — pizza, burger, beverages — with timers, removals and allergies in large type.", c: "Kitchen display" },
  { n: "04", t: "The floor", d: "Waiters get instant sound alerts, claim tables, see what’s ready, answer ‘call waiter’ taps and mark orders served.", c: "Employee panel" },
];

export default async function Home() {
  await ensurePlans();
  await ensureDemo();
  const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.priceCents));
  const demo = process.env.TAPMENU_SEED_DEMO !== "false";
  return (
    <div className="relative overflow-x-clip bg-[#090806]">
      <header className="absolute inset-x-0 top-0 z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <p className="font-display text-2xl text-white">Tap<span className="gold-text">Menu</span> 3D</p>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-full px-4 py-2 text-neutral-300 hover:text-white">Sign in</Link>
          <Link href="/signup" className="rounded-full bg-white px-5 py-2 font-medium text-black hover:bg-amber-200">Start free</Link>
        </nav>
      </header>

      <section className="grain relative isolate flex min-h-[100dvh] items-center overflow-hidden px-6 pt-24">
        <div className="absolute -right-40 top-10 -z-10 h-[40rem] w-[40rem] rounded-full bg-orange-600/20 blur-[140px]" />
        <div className="absolute -left-40 bottom-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-amber-500/10 blur-[120px]" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-1.5 text-xs uppercase tracking-[0.25em] text-amber-200">NFC · 3D · AR · Live kitchen</p>
            <h1 className="font-display text-6xl leading-[0.92] text-white sm:text-8xl">
              Tap.<br />
              <span className="gold-text">See it.</span><br />
              Taste it.
            </h1>
            <p className="mt-7 max-w-lg text-lg leading-relaxed text-neutral-400">
              TapMenu 3D turns a table card into a cinematic ordering experience — and every order flows straight to your owner dashboard, kitchen stations and floor staff in real time.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              {demo && <Link href="/r/ember-crust?table=T04" className="rounded-full bg-gradient-to-b from-amber-300 to-orange-500 px-7 py-4 font-semibold text-black shadow-[0_18px_50px_-14px_rgba(251,146,60,.8)] transition hover:scale-[1.03]">Tap the demo card →</Link>}
              <Link href="/signup" className="rounded-full border border-white/20 px-7 py-4 font-medium text-white transition hover:bg-white/10">Create your restaurant</Link>
            </div>
            {demo && <p className="mt-4 text-xs text-neutral-600">Demo opens table T04 at “Ember &amp; Crust”. Staff demo logins are on the sign-in page.</p>}
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[34rem]">
            <div className="absolute inset-6 rounded-full border border-amber-400/10" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,.18),transparent_65%)]" />
            <Hero3D />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-28">
        <p className="text-xs uppercase tracking-[0.3em] text-amber-300/80">One platform, four experiences</p>
        <h2 className="font-display mt-3 max-w-2xl text-5xl text-white">Every role gets exactly the screen it needs.</h2>
        <div className="mt-14 divide-y divide-white/10 border-y border-white/10">
          {EXPERIENCES.map((e) => (
            <div key={e.n} className="grid items-baseline gap-4 py-8 md:grid-cols-[100px_1fr_2fr_auto]">
              <span className="font-display text-5xl text-white/20">{e.n}</span>
              <h3 className="font-display text-3xl text-white">{e.t}</h3>
              <p className="text-neutral-400">{e.d}</p>
              <span className="text-xs uppercase tracking-widest text-amber-300/70">{e.c}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 bg-gradient-to-b from-transparent via-amber-500/[0.04] to-transparent px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-3">
          {[
            ["Customisation engine", "Sizes, crusts, toppings with per-size pricing, extra quantities, removals, spice levels, conditional options. Totals recalculate instantly — and are re-validated on the server."],
            ["Real-time operations", "Orders are saved first, then routed to owner, kitchen stations and staff with sound alerts, duplicate protection and reconnect handling."],
            ["Voice & AI", "Read any order aloud, or get a concise kitchen summary that’s guaranteed to keep every modification — shown next to the original."],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-display text-3xl text-white">{t}</h3>
              <p className="mt-3 text-neutral-400">{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-28">
        <h2 className="font-display text-5xl text-white">Simple plans</h2>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {plans.filter((p) => p.active).map((p, i) => (
            <div key={p.id} className={`rounded-3xl border p-8 ${i === 1 ? "border-amber-400/50 bg-amber-500/[0.06]" : "border-white/10"}`}>
              <p className="font-display text-3xl text-white">{p.name}</p>
              <p className="mt-3 text-5xl text-amber-300">{p.priceCents === 0 ? "Free" : formatMoney(p.priceCents, "USD")}<span className="text-base text-neutral-500">{p.priceCents ? " /mo" : ""}</span></p>
              <ul className="mt-6 space-y-2 text-sm text-neutral-300">
                <li>{p.maxBranches} branch{p.maxBranches > 1 ? "es" : ""} · {p.maxTables} tables</li>
                <li>{p.maxMenuItems} dishes · {p.maxEmployees} team members</li>
                {p.features.map((f) => <li key={f} className="text-neutral-400">✓ {f}</li>)}
              </ul>
              <Link href="/signup" className="mt-7 block rounded-full border border-white/20 py-3 text-center text-sm font-medium text-white hover:bg-white/10">Start with {p.name}</Link>
            </div>
          ))}
        </div>
      </section>
      <footer className="border-t border-white/10 px-6 py-10 text-center text-sm text-neutral-600">© {new Date().getFullYear()} TapMenu 3D</footer>
    </div>
  );
}
