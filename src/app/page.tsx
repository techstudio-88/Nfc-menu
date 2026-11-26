import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";
import { ensureDemo, ensurePlans } from "@/lib/seed";
import { formatMoney } from "@/lib/pricing";
import Hero3D from "@/components/landing/Hero3D";

export const dynamic = "force-dynamic";

const roles = [
  { n: "01", title: "The guest", eyebrow: "A menu worth exploring", body: "One tap opens a beautifully branded menu. Guests explore dishes in 3D, tailor every ingredient and see the price update instantly.", tag: "CUSTOMER EXPERIENCE" },
  { n: "02", title: "The owner", eyebrow: "Your restaurant, in control", body: "Manage dishes, modifiers, prices, taxes, tables, NFC cards, coupons and performance from one calm, powerful workspace.", tag: "OWNER STUDIO" },
  { n: "03", title: "The kitchen", eyebrow: "Every ticket, in the right place", body: "Orders route to the right station with clear modifiers, allergy notes, timers and live status updates.", tag: "KITCHEN DISPLAY" },
  { n: "04", title: "The floor", eyebrow: "Service that stays in sync", body: "Staff see what is ready, respond to table calls, claim orders and keep every guest looked after.", tag: "TEAM OPERATIONS" },
];

const capabilities = [
  ["01", "A menu that moves", "Bring every dish to life with interactive 3D views, rich descriptions and a visual experience that feels made for your restaurant."],
  ["02", "Build every bite", "Let guests choose sizes, crusts, toppings, extras and removals. Pricing recalculates as they customise."],
  ["03", "A smarter table", "Give every table its own NFC identity. Guests tap, browse and order without installing an app or creating an account."],
  ["04", "One connected service", "Orders move from the guest's phone to the owner, kitchen and floor team with live updates."],
];

export default async function Home() {
  await ensurePlans();
  await ensureDemo();
  const plans = await db.select().from(subscriptionPlans).orderBy(asc(subscriptionPlans.priceCents));
  const demo = process.env.TAPMENU_SEED_DEMO !== "false";

  return (
    <main className="relative overflow-hidden bg-[#090806] text-white selection:bg-amber-300 selection:text-black">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#090806]/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="font-display text-2xl tracking-tight">Tap<span className="gold-text">Menu</span><span className="ml-1 text-xs text-white/40">3D</span></Link>
          <nav className="hidden items-center gap-8 text-sm text-white/55 md:flex">
            <a href="#experience" className="transition hover:text-white">Experience</a>
            <a href="#platform" className="transition hover:text-white">Platform</a>
            <a href="#pricing" className="transition hover:text-white">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm text-white/70 transition hover:text-white">Sign in</Link>
            <Link href="/signup" className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-200">Get started <span aria-hidden>↗</span></Link>
          </div>
        </div>
      </header>

      <section className="grain relative isolate flex min-h-[100svh] items-center px-5 pb-16 pt-28 sm:px-8">
        <div className="pointer-events-none absolute -right-48 top-10 -z-10 h-[46rem] w-[46rem] rounded-full bg-orange-600/15 blur-[150px]" />
        <div className="pointer-events-none absolute -left-56 bottom-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-amber-500/10 blur-[140px]" />
        <div className="mx-auto grid w-full max-w-7xl items-center gap-4 lg:grid-cols-[1fr_1.05fr]">
          <div className="relative z-10 py-10">
            <p className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/[0.07] px-4 py-2 text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200 sm:text-xs"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-300" /> The next course of restaurant technology</p>
            <h1 className="font-display max-w-3xl text-[4.4rem] leading-[.83] tracking-[-.055em] sm:text-8xl lg:text-[7.2rem]">Make every<br /><span className="gold-text italic">table</span> an<br />experience.</h1>
            <p className="mt-8 max-w-xl text-base leading-8 text-white/55 sm:text-lg">A simple tap. A beautiful 3D menu. A faster service flow. TapMenu brings the guest experience and the restaurant operation together in one connected platform.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              {demo && <Link href="/r/ember-crust?table=T04" className="group rounded-full bg-gradient-to-br from-amber-200 via-amber-400 to-orange-500 px-7 py-4 text-sm font-bold text-black shadow-[0_15px_55px_-15px_rgba(249,115,22,.65)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_70px_-14px_rgba(249,115,22,.75)]">Explore live menu <span className="ml-2 inline-block transition group-hover:translate-x-1">↗</span></Link>}
              <Link href="/signup" className="rounded-full border border-white/15 bg-white/[0.035] px-7 py-4 text-sm font-medium text-white transition hover:border-white/35 hover:bg-white/10">Build your restaurant</Link>
            </div>
            <div className="mt-12 flex flex-wrap gap-x-8 gap-y-3 text-[10px] uppercase tracking-[.2em] text-white/35"><span>01 / Tap to open</span><span>02 / Explore in 3D</span><span>03 / Order in real time</span></div>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[43rem]">
            <div className="absolute inset-[7%] rounded-full border border-amber-200/10" />
            <div className="absolute inset-[15%] rounded-full border border-dashed border-white/[0.09]" />
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(251,146,60,.2),transparent_64%)]" />
            <div className="absolute left-[13%] top-[18%] h-2 w-2 animate-pulse rounded-full bg-amber-200 shadow-[0_0_25px_8px_rgba(251,191,36,.25)]" />
            <div className="absolute bottom-[17%] right-[14%] h-1.5 w-1.5 animate-pulse rounded-full bg-orange-300 [animation-delay:1s]" />
            <Hero3D />
            <div className="glass absolute bottom-[9%] left-[1%] rounded-2xl px-4 py-3 shadow-2xl sm:left-0"><p className="text-[9px] uppercase tracking-[.22em] text-amber-200/70">Made to be explored</p><p className="mt-1 text-sm font-medium text-white">A menu beyond the screen</p></div>
            <div className="glass absolute right-[1%] top-[12%] rounded-2xl px-4 py-3 shadow-2xl sm:right-0"><p className="text-[9px] uppercase tracking-[.22em] text-white/40">Guest journey</p><p className="mt-1 text-sm font-medium text-white">Tap · Discover · Enjoy</p></div>
          </div>
        </div>
        <a href="#experience" className="absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-[9px] uppercase tracking-[.3em] text-white/35 md:flex"><span>Scroll to explore</span><span className="h-9 w-px bg-gradient-to-b from-amber-300/70 to-transparent" /></a>
      </section>

      <div className="border-y border-white/[0.07] bg-white/[0.02] py-5">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 text-[10px] uppercase tracking-[.24em] text-white/40 sm:justify-between sm:px-8"><span>NFC connected</span><span className="text-amber-200/70">✳</span><span>Interactive 3D dishes</span><span className="text-amber-200/70">✳</span><span>Live order flow</span><span className="text-amber-200/70">✳</span><span>One restaurant platform</span></div>
      </div>

      <section id="experience" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-28 sm:px-8 sm:py-36">
        <div className="grid gap-8 md:grid-cols-[.8fr_1.2fr] md:items-end">
          <p className="text-xs uppercase tracking-[.3em] text-amber-300/70">01 — The experience</p>
          <div><h2 className="font-display max-w-3xl text-5xl leading-[.98] tracking-tight sm:text-7xl">The first impression<br /><span className="gold-text italic">starts at the table.</span></h2><p className="mt-6 max-w-xl text-base leading-7 text-white/45">Replace static paper menus with a digital experience that invites guests to look closer, make it theirs and order with confidence.</p></div>
        </div>
        <div className="mt-20 grid gap-4 md:grid-cols-2">
          {roles.map((r, i) => <article key={r.n} className="group relative min-h-[19rem] overflow-hidden rounded-[2rem] border border-white/[0.09] bg-gradient-to-br from-white/[0.055] to-white/[0.012] p-8 transition duration-500 hover:-translate-y-1 hover:border-amber-200/25 sm:p-10"><div className="absolute -right-12 -top-16 h-52 w-52 rounded-full bg-orange-500/[0.07] blur-3xl transition duration-700 group-hover:bg-orange-400/[0.16]" /><div className="relative flex h-full flex-col"><div className="flex items-center justify-between"><span className="font-display text-5xl text-white/15">{r.n}</span><span className="text-[9px] tracking-[.25em] text-amber-200/55">{r.tag}</span></div><div className="mt-auto pt-10"><p className="text-xs uppercase tracking-[.2em] text-amber-200/60">{r.eyebrow}</p><h3 className="font-display mt-3 text-4xl text-white">{r.title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-white/45">{r.body}</p></div></div></article>)}
        </div>
      </section>

      <section className="relative overflow-hidden border-y border-white/[0.07] bg-[#100d09] px-5 py-28 sm:px-8 sm:py-36">
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-600/[0.09] blur-[130px]" />
        <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.9fr_1.1fr]">
          <div><p className="text-xs uppercase tracking-[.3em] text-amber-300/70">02 — Built for appetite</p><h2 className="font-display mt-6 text-5xl leading-[.98] sm:text-7xl">Let guests see<br />what they <span className="gold-text italic">crave.</span></h2><p className="mt-7 max-w-md text-base leading-8 text-white/45">A dish should look as irresistible on screen as it does when it reaches the table. Explore, rotate and customise with a visual-first menu.</p><Link href={demo ? "/r/ember-crust?table=T04" : "/signup"} className="mt-9 inline-flex rounded-full border border-amber-200/30 px-6 py-3 text-sm text-amber-100 transition hover:bg-amber-200 hover:text-black">See the menu in action ↗</Link></div>
          <div className="grid gap-3 sm:grid-cols-2">{capabilities.map(([n,t,d]) => <div key={n} className="rounded-3xl border border-white/[0.08] bg-black/25 p-6 sm:p-7"><span className="text-xs text-amber-200/55">{n}</span><h3 className="font-display mt-7 text-2xl">{t}</h3><p className="mt-3 text-sm leading-6 text-white/40">{d}</p></div>)}</div>
        </div>
      </section>

      <section id="platform" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-28 sm:px-8 sm:py-36">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><p className="text-xs uppercase tracking-[.3em] text-amber-300/70">03 — Behind every tap</p><h2 className="font-display mt-5 text-5xl sm:text-7xl">One flow.<br /><span className="gold-text italic">Every team.</span></h2></div><p className="max-w-md text-sm leading-7 text-white/45">A great guest experience is only the beginning. TapMenu keeps the people behind the service connected, from the first order to the final plate.</p></div>
        <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.025] p-6 sm:p-10"><div className="grid gap-4 md:grid-cols-4">{["Guest taps NFC", "Order is received", "Kitchen prepares", "Team serves"].map((s,i) => <div key={s} className="relative rounded-2xl bg-black/35 p-6"><span className="text-xs text-amber-200/60">0{i+1}</span><p className="mt-8 font-display text-2xl">{s}</p>{i < 3 && <span className="absolute right-4 top-1/2 hidden -translate-y-1/2 text-xl text-amber-200/50 md:block">→</span>}</div>)}</div><p className="mt-7 text-center text-xs tracking-wide text-white/35">A connected restaurant journey — without adding friction for your guests.</p></div>
      </section>

      <section id="pricing" className="scroll-mt-24 border-t border-white/[0.07] bg-[#0d0b08] px-5 py-28 sm:px-8 sm:py-32">
        <div className="mx-auto max-w-7xl"><p className="text-xs uppercase tracking-[.3em] text-amber-300/70">04 — Choose your pace</p><div className="mt-5 flex flex-col justify-between gap-5 md:flex-row md:items-end"><h2 className="font-display text-5xl sm:text-7xl">Simple plans.<br /><span className="gold-text italic">Room to grow.</span></h2><p className="max-w-sm text-sm leading-7 text-white/40">Start with what you need today. Add more tables, branches and team capacity as your restaurant grows.</p></div>
          <div className="mt-14 grid gap-5 md:grid-cols-3">{plans.filter((p) => p.active).map((p,i) => <article key={p.id} className={`rounded-[2rem] border p-8 ${i === 1 ? "border-amber-300/40 bg-amber-300/[0.055] shadow-[0_20px_80px_-35px_rgba(245,158,11,.25)]" : "border-white/10 bg-white/[0.02]"}`}><p className="text-xs uppercase tracking-[.22em] text-amber-200/65">{i === 1 ? "Most popular" : "TapMenu plan"}</p><h3 className="font-display mt-4 text-3xl">{p.name}</h3><p className="mt-5 text-4xl text-amber-200">{p.priceCents === 0 ? "Free" : formatMoney(p.priceCents, "USD")}<span className="text-sm text-white/35">{p.priceCents ? " / month" : ""}</span></p><ul className="mt-8 space-y-3 text-sm text-white/55"><li>{p.maxBranches} branch{p.maxBranches > 1 ? "es" : ""} · {p.maxTables} tables</li><li>{p.maxMenuItems} dishes · {p.maxEmployees} team members</li>{p.features.map(f => <li key={f}>✳ {f}</li>)}</ul><Link href="/signup" className="mt-9 block rounded-full border border-white/15 py-3.5 text-center text-sm transition hover:border-amber-200/50 hover:bg-white/[0.04]">Start with {p.name} ↗</Link></article>)}</div>
        </div>
      </section>

      <footer className="relative overflow-hidden border-t border-white/[0.08] px-5 py-20 sm:px-8 sm:py-24"><div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[42rem] -translate-x-1/2 rounded-full bg-amber-500/[0.08] blur-[100px]" /><div className="relative mx-auto max-w-7xl"><p className="text-xs uppercase tracking-[.3em] text-amber-200/60">Your table is ready</p><div className="mt-5 flex flex-col justify-between gap-8 md:flex-row md:items-end"><h2 className="font-display max-w-3xl text-5xl leading-none sm:text-7xl">Give every guest<br />a reason to <span className="gold-text italic">come back.</span></h2><Link href="/signup" className="inline-flex w-fit rounded-full bg-amber-300 px-7 py-4 text-sm font-bold text-black transition hover:-translate-y-1 hover:bg-amber-200">Start building ↗</Link></div><div className="mt-20 flex flex-col justify-between gap-4 border-t border-white/10 pt-7 text-xs text-white/35 sm:flex-row"><span className="font-display text-xl text-white">Tap<span className="gold-text">Menu</span> 3D</span><span>© {new Date().getFullYear()} TapMenu. Made for memorable service.</span><div className="flex gap-5"><Link href="/login" className="hover:text-white">Sign in</Link><Link href="/signup" className="hover:text-white">Get started</Link></div></div></div></footer>
    </main>
  );
}
