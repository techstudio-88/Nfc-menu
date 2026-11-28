import Link from "next/link";
import type { ReactNode } from "react";
import LandingMotion from "@/components/landing/LandingMotion";

function LineIcon({ name, className = "" }: { name: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, ReactNode> = {
    spark: <><path d="M12 2.8 14.4 9.6 21.2 12l-6.8 2.4L12 21.2l-2.4-6.8L2.8 12l6.8-2.4L12 2.8Z" /><path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7L19 2Z" /></>,
    plate: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="5.2" /><path d="M3 4v5M1.5 6.5h3M21 4v7M19.5 11h3" /></>,
    sliders: <><path d="M4 7h9m4 0h3M4 17h3m4 0h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>,
    nfc: <><path d="M5 8a6 6 0 0 1 0 8M8 5a10 10 0 0 1 0 14M11 2a14 14 0 0 1 0 20" /><rect x="14" y="7" width="7" height="10" rx="1.5" /></>,
    bolt: <path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z" />,
    chef: <><path d="M6 11a4 4 0 1 1 7.5-2A4.5 4.5 0 1 1 19 14v5H6v-8Z" /><path d="M9 19v2h9v-2" /></>,
    cube: <><path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" /><path d="m4 7.5 8 4.5 8-4.5M12 12v9" /></>,
    check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>{paths[name] ?? paths.spark}</svg>;
}

const features = [
  ["01", "Menus guests love", "Every dish with great photos and a 3D preview, so guests choose with confidence.", "cube"],
  ["02", "Every order, just right", "Sizes, toppings and extras. The price updates live as guests choose.", "sliders"],
  ["03", "One tap is all it takes", "Guests tap your NFC card and the menu opens. No app, no signup.", "nfc"],
  ["04", "Orders reach your kitchen", "Each order lands on the right kitchen screen and is tracked start to finish.", "bolt"],
] as const;
const roles = [
  ["GUEST EXPERIENCE", "A menu guests remember", "Beautiful menus, interactive dishes, clear prices and effortless ordering."],
  ["OWNER STUDIO", "Your restaurant, your rules", "Manage dishes, modifiers, prices, tables, NFC cards, staff and offers."],
  ["KITCHEN DISPLAY", "Every ticket in the right place", "Orders by station with clear modifiers, timers and live status."],
  ["COUNTER POS", "Take orders at the counter", "Dine-in, takeaway and delivery from one fast point-of-sale screen."],
  ["ORDER CHANNELS", "Every app in one feed", "Swiggy, Zomato and ONDC orders — through a partner — land beside dine-in on the same kitchen screen."],
  ["OWNER INSIGHTS", "Know what sells", "Live sales, best dishes and channel revenue on one animated dashboard."],
  ["TEAM OPERATIONS", "A floor that stays in sync", "Staff see table requests, order progress and service status in real time."],
];
const steps = [
  ["01", "Tap", "A guest taps the NFC card on their table.", "nfc"],
  ["02", "Discover", "Your digital menu opens instantly in their browser.", "spark"],
  ["03", "Customise", "They explore dishes and build their order.", "sliders"],
  ["04", "Enjoy", "The order reaches your team and service keeps moving.", "chef"],
] as const;
const marquee = ["COUNTER POS", "DELIVERY-APP ORDER FEED", "BRAND COLOURS", "NFC TAP", "QR FALLBACK", "3D DISH PREVIEWS", "LIVE KITCHEN DISPLAY", "MULTI-LANGUAGE MENUS", "MODIFIERS & EXTRAS", "COUPONS", "TABLE REQUESTS", "SALES ANALYTICS", "ORDER TRACKING"];
// Edit these to match your real offer — prices are intentionally left as a quote until you set them.
const plans = [
  { name: "Starter", tag: "One venue", price: "Custom quote", featured: false, points: ["Digital menu with photos & 3D previews", "NFC cards + printable QR fallback", "Live kitchen display", "Guest order tracking", "Counter POS"] },
  { name: "Growth", tag: "Busy kitchens", price: "Custom quote", featured: true, points: ["Everything in Starter", "Multiple kitchen stations", "Modifiers, coupons & service charge", "Kitchen & floor staff roles", "Sales analytics", "Delivery-app order feed", "Your own brand colours"] },
  { name: "Group", tag: "Multiple branches", price: "Custom quote", featured: false, points: ["Everything in Growth", "Multiple branches & tables", "Multi-language menus", "Owner overview across venues"] },
];

function Plate() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="plate" cx="50%" cy="40%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#e3ece7" /></radialGradient>
        <radialGradient id="crust" cx="50%" cy="40%"><stop offset="0" stopColor="#f8edd6" /><stop offset="1" stopColor="#ecd6ac" /></radialGradient>
      </defs>
      <circle cx="60" cy="62" r="52" fill="#04251d" opacity=".12" />
      <circle cx="60" cy="58" r="52" fill="url(#plate)" stroke="#d3e0d9" />
      <circle cx="60" cy="58" r="40" fill="url(#crust)" />
      <circle cx="60" cy="58" r="34" fill="#f3dfb7" opacity=".6" />
      {[[48, 46], [70, 50], [58, 68], [76, 70], [44, 66], [62, 40]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="6.2" fill="#b3283a" />)}
      {[[54, 54, 20], [68, 60, -30], [50, 74, 60], [72, 44, 10]].map(([x, y, r], i) => <ellipse key={i} cx={x} cy={y} rx="5.5" ry="2.6" fill="#087653" transform={`rotate(${r} ${x} ${y})`} />)}
    </svg>
  );
}

function PhoneMock() {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <div className="pointer-events-none absolute inset-0 -z-0 grid place-items-center" aria-hidden="true"><span className="lp-ring" /><span className="lp-ring" /><span className="lp-ring" /></div>
      <div className="relative z-10 mx-auto w-[min(76%,290px)] animate-float">
        <div className="lp-phone">
          <div className="lp-screen">
            <div className="mx-auto mt-2 h-4 w-20 rounded-full bg-[#1c070b]" />
            <div className="px-4 pb-5 pt-3">
              <div className="flex items-center justify-between">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-brand font-display text-base text-[#ffffff]">E</span>
                <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-[9px] font-semibold tracking-wider text-brand-deep">TABLE T04</span>
              </div>
              <p className="mt-3 text-[8px] tracking-[.3em] text-mute">WELCOME TO</p>
              <p className="font-display text-2xl leading-none text-ink">Ember &amp; Crust</p>
              <div className="mt-3 flex gap-1.5 text-[9px] font-medium">
                <span className="rounded-full bg-brand px-2.5 py-1 text-[#ffffff]">Pizza</span><span className="rounded-full border border-line bg-surface px-2.5 py-1 text-mute">Pasta</span><span className="rounded-full border border-line bg-surface px-2.5 py-1 text-mute">Drinks</span>
              </div>
              <div className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_14px_30px_-20px_rgba(6,75,55,.5)]">
                <div className="relative aspect-[5/4] bg-[radial-gradient(ellipse_at_50%_40%,rgba(11,140,100,.18),transparent_70%)]">
                  <div className="absolute inset-3"><Plate /></div>
                  <span className="absolute left-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[8px] font-semibold tracking-wider text-[#ffffff]">3D · AR</span>
                </div>
                <div className="flex items-center justify-between px-3 py-2.5">
                  <div><p className="font-display text-base leading-none text-ink">Margherita</p><p className="mt-1 text-[8px] text-mute">Basil · tomato · mozzarella</p></div>
                  <span className="rounded-full bg-brand-deep px-2.5 py-1 text-[10px] font-semibold text-[#ffffff]">₹349</span>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between rounded-full bg-brand px-4 py-2.5 text-[10px] font-semibold text-[#ffffff]"><span>Your bag · 2</span><span>₹698</span></div>
            </div>
          </div>
        </div>
      </div>
      <div className="lp-chip absolute left-0 top-[14%] z-20 flex items-center gap-2 rounded-2xl px-3 py-2 text-[10px] tracking-wider text-white sm:-left-4" style={{ animation: "float 7s ease-in-out infinite" }}><LineIcon name="nfc" className="h-4 w-4 text-[#ef9aa4]" /><span>TAP TO OPEN</span></div>
      <div className="lp-chip absolute right-0 top-[40%] z-20 flex items-center gap-2 rounded-2xl px-3 py-2 text-[10px] tracking-wider text-white sm:-right-4" style={{ animation: "float 8s ease-in-out -2s infinite" }}><LineIcon name="cube" className="h-4 w-4 text-[#ef9aa4]" /><span>ROTATE IN 3D</span></div>
      <div className="lp-chip absolute bottom-[8%] left-1 z-20 flex items-center gap-2.5 rounded-2xl px-3 py-2 text-[10px] tracking-wider text-white sm:-left-6" style={{ animation: "float 9s ease-in-out -4s infinite" }}><span className="h-2 w-2 animate-pulse rounded-full bg-[#e0566a] shadow-[0_0_10px_#e0566a]" /><span>ORDER #128 → KITCHEN</span></div>
    </div>
  );
}

export default function Home() {
  const demo = process.env.TAPMENU_SEED_DEMO !== "false";
  const menuHref = demo ? "/r/ember-crust?table=T04" : "/signup";
  return (
    <main className="relative overflow-x-clip bg-porcelain text-ink">
      <LandingMotion />
      <header className="fixed inset-x-0 top-0 z-50 border-b border-line bg-surface/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-4 px-5 py-3.5 sm:px-8 lg:px-12">
          <Link href="/" className="senso-wordmark text-xl sm:text-2xl">TAPMENU</Link>
          <nav className="hidden items-center gap-8 text-[11px] font-medium tracking-[.12em] text-mute lg:flex" aria-label="Sections">
            {[["#experience", "EXPERIENCE"], ["#platform", "PLATFORM"], ["#how", "HOW IT WORKS"], ["#demo", "DEMO"], ["#pricing", "PRICING"]].map(([h, l]) => <a key={h} href={h} className="transition hover:text-brand">{l}</a>)}
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="px-2 py-2 text-[11px] font-medium tracking-[.1em] text-mute transition hover:text-ink">LOG IN</Link>
            <Link href="/signup" className="lp-shine rounded-full bg-brand px-5 py-2.5 text-[11px] font-semibold tracking-[.08em] text-[#ffffff] shadow-[0_10px_24px_-10px_rgba(8,118,83,.7)] transition hover:bg-brand-deep">REQUEST ACCESS</Link>
          </div>
        </div>
      </header>

      <section id="home" className="lp-hero tm-dark">
        <div className="lp-orb -left-24 top-20 h-80 w-80 bg-brand-bright/40" aria-hidden="true" />
        <div className="lp-orb -right-24 bottom-0 h-96 w-96 bg-[#8f1d2c]/30" aria-hidden="true" style={{ animationDirection: "alternate-reverse" }} />
        <div className="mx-auto grid min-h-[100svh] max-w-[1360px] items-center gap-10 px-5 pb-16 pt-28 sm:px-8 lg:grid-cols-[1.05fr_.95fr] lg:gap-6 lg:px-12">
          <div className="lp-hero-in max-w-[640px]">
            <p className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[.22em] text-[#f3b4bb]"><span className="h-px w-8 bg-[#f3b4bb]" />A BETTER WAY TO ORDER</p>
            <h1 className="mt-6 font-display text-[3.4rem] leading-[.98] tracking-[-.03em] text-white sm:text-7xl lg:text-[clamp(4.4rem,6vw,6.4rem)]">
              Your menu.<br />
              <span className="relative inline-block italic text-[#fff1f2]">Made magical.
                <svg viewBox="0 0 300 14" preserveAspectRatio="none" aria-hidden="true" className="absolute -bottom-2 left-0 h-3 w-full"><path d="M3 9c60-8 130-8 190-3 40 3 70 3 104-2" fill="none" stroke="#c93a4d" strokeWidth="3.5" strokeLinecap="round" /></svg>
              </span>
            </h1>
            <p className="mt-8 max-w-[470px] text-[15px] leading-8 text-[#f0d5d8]">Give every table a smart digital menu. Guests tap, explore dishes, choose what they love and order in seconds — and your kitchen sees it instantly.</p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Link href="/demo" className="lp-shine inline-flex min-h-[52px] items-center gap-2 rounded-full bg-gradient-to-b from-[#c93a4d] to-[#8f1d2c] px-7 text-[12px] font-semibold tracking-[.1em] text-white shadow-[0_16px_36px_-12px_rgba(179,40,58,.75)] transition hover:-translate-y-0.5">▶ TRY THE LIVE DEMO</Link>
              <Link href={menuHref} className="inline-flex min-h-[52px] items-center rounded-full border border-white/30 px-7 text-[12px] font-semibold tracking-[.1em] text-white transition hover:border-white hover:bg-white/10">VIEW SAMPLE MENU</Link>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-5 gap-y-2 text-[10px] tracking-[.16em] text-[#c99aa2]"><span>NFC ENABLED</span><span>·</span><span>INTERACTIVE 3D</span><span>·</span><span>LIVE ORDERS</span></div>
          </div>
          <PhoneMock />
        </div>
      </section>

      <div className="border-y border-line bg-surface py-5" aria-label="Capabilities">
        <div className="lp-marquee-wrap"><div className="lp-marquee">{[...marquee, ...marquee].map((m, i) => <span key={i} className="mx-6 inline-flex items-center gap-6 text-[11px] font-semibold tracking-[.2em] text-brand-deep"><span>{m}</span><span className="h-1.5 w-1.5 rounded-full bg-signal" aria-hidden="true" /></span>)}</div></div>
      </div>

      <section id="experience" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
        <p className="text-[11px] font-semibold tracking-[.25em] text-signal">01 — THE GUEST EXPERIENCE</p>
        <div className="mt-5 grid gap-7 md:grid-cols-[1.1fr_.9fr] md:items-end">
          <h2 className="font-display text-5xl leading-[1.02] text-ink sm:text-7xl">A menu made<br /><em className="text-brand">for everyone.</em></h2>
          <p className="max-w-lg text-[15px] leading-7 text-mute">Paper menus show a list. TapMenu creates a moment. Guests discover dishes, understand every option and order at their own pace.</p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2">
          {features.map(([n, t, d, icon]) => (
            <article key={n} data-reveal className="lp-card group min-h-[230px] p-7 sm:p-9">
              <div className="flex items-center justify-between"><span className="font-display text-4xl text-brand/25">{n}</span><span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-soft text-brand transition duration-500 group-hover:bg-brand group-hover:text-[#ffffff]"><LineIcon name={icon} className="h-5 w-5" /></span></div>
              <h3 className="mt-9 font-display text-3xl text-ink">{t}</h3>
              <p className="mt-3 max-w-lg text-sm leading-6 text-mute">{d}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="platform" className="border-y border-line bg-brand-soft/60 px-5 py-24 sm:px-8 sm:py-32">
        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="text-[11px] font-semibold tracking-[.25em] text-signal">02 — ONE CONNECTED PLATFORM</p>
            <h2 className="mt-5 font-display text-5xl leading-[1.03] text-ink sm:text-7xl">Simple for guests.<br /><em className="text-brand">Powerful for your team.</em></h2>
            <p className="mt-6 max-w-md text-[15px] leading-7 text-mute">Guests get an easy menu. Your team manages dishes, prices, tables and orders from one place.</p>
            <Link href="/signup" className="lp-shine mt-8 inline-flex min-h-[48px] items-center rounded-full bg-brand px-7 text-[11px] font-semibold tracking-[.1em] text-[#ffffff] shadow-[0_14px_30px_-12px_rgba(8,118,83,.7)] transition hover:bg-brand-deep">SET UP YOUR RESTAURANT</Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {roles.map(([tag, title, body]) => (
              <div key={tag} data-reveal className="lp-card p-7"><p className="text-[10px] font-semibold tracking-[.18em] text-brand">{tag}</p><h3 className="mt-7 font-display text-2xl text-ink">{title}</h3><p className="mt-3 text-sm leading-6 text-mute">{body}</p></div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
        <p className="text-[11px] font-semibold tracking-[.25em] text-signal">03 — AS EASY AS A TAP</p>
        <h2 className="mt-5 font-display text-5xl text-ink sm:text-7xl">Four easy steps.</h2>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(([n, t, d, icon]) => (
            <div key={n} data-reveal className="lp-card flex flex-col p-7">
              <div className="flex items-center justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand text-[#ffffff]"><LineIcon name={icon} className="h-6 w-6" /></span><span className="font-mono text-xs tracking-[.18em] text-mute">{n}</span></div>
              <h3 className="mt-10 font-display text-3xl text-ink">{t}</h3><p className="mt-3 text-sm leading-6 text-mute">{d}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col items-start justify-between gap-6 border-y border-line py-8 sm:flex-row sm:items-center">
          <div><p className="text-[10px] font-semibold tracking-[.2em] text-signal">NO APP DOWNLOAD REQUIRED</p><p className="mt-2 font-display text-3xl text-ink">One tap. Straight to your menu.</p></div>
          <Link href={menuHref} className="inline-flex min-h-[48px] items-center rounded-full border border-brand/30 px-7 text-[11px] font-semibold tracking-[.1em] text-brand-deep transition hover:bg-brand hover:text-[#ffffff]">TRY THE DEMO MENU ↗</Link>
        </div>
      </section>

      <section id="demo" className="tm-dark relative scroll-mt-24 overflow-hidden bg-brand-night px-5 py-24 text-white sm:px-8 sm:py-32">
        <div className="lp-orb right-0 top-0 h-96 w-96 bg-brand-bright/30" aria-hidden="true" />
        <div className="mx-auto max-w-7xl">
          <p className="text-[11px] font-semibold tracking-[.25em] text-[#f3b4bb]">04 — TRY IT YOURSELF</p>
          <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_.8fr] lg:items-end">
            <div><h2 className="font-display text-5xl leading-[1.03] sm:text-7xl">Take a look.<br /><em className="text-[#f3b4bb]">Try everything.</em></h2><p className="mt-6 max-w-xl text-[15px] leading-7 text-[#e3c1c6]">Explore a sample restaurant, place a test order and see how the team tools work. No setup needed.</p></div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Link href="/demo" className="lp-shine inline-flex min-h-[52px] items-center rounded-full bg-gradient-to-b from-[#c93a4d] to-[#8f1d2c] px-7 text-[11px] font-semibold tracking-[.1em] text-white shadow-[0_16px_36px_-12px_rgba(179,40,58,.75)]">OPEN FULL DEMO ↗</Link>
              <Link href={menuHref} className="inline-flex min-h-[52px] items-center rounded-full border border-white/30 px-7 text-[11px] font-semibold tracking-[.1em] text-white transition hover:bg-white/10">VIEW SAMPLE MENU</Link>
            </div>
          </div>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[["plate", "Explore the menu", "Browse sample dishes, change options and add items to your cart."], ["check", "Place a test order", "Try the full guest flow with sample tables and test data."], ["bolt", "See the team tools", "Switch between the owner, kitchen and staff views in the demo."]].map(([icon, t, d]) => (
              <article key={t} data-reveal className="rounded-3xl border border-white/10 bg-white/[.05] p-7 backdrop-blur transition duration-500 hover:-translate-y-1.5 hover:border-[#f08a96]/40 hover:bg-white/[.08]"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f08a96]/15 text-[#ef9aa4]"><LineIcon name={icon} className="h-5 w-5" /></span><h3 className="mt-6 font-display text-2xl">{t}</h3><p className="mt-3 text-sm leading-6 text-[#e3c1c6]">{d}</p></article>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
        <p className="text-[11px] font-semibold tracking-[.25em] text-signal">05 — YOUR RESTAURANT, YOUR GROWTH</p>
        <div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end"><h2 className="font-display text-5xl text-ink sm:text-7xl">Ready to make<br /><em className="text-brand">service easier?</em></h2><p className="max-w-md text-[15px] leading-7 text-mute">Pick the setup that fits your venue. We create approved restaurant workspaces and help you go live.</p></div>
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((p) => (
            <article key={p.name} data-reveal className={`lp-card flex flex-col p-8 ${p.featured ? "!border-brand !bg-gradient-to-b from-brand to-brand-deep text-white shadow-[0_40px_80px_-30px_rgba(8,118,83,.7)]" : ""}`}>
              <div className="flex items-center justify-between"><p className={`text-[10px] font-semibold tracking-[.2em] ${p.featured ? "text-[#f1ccd0]" : "text-brand"}`}>{p.tag.toUpperCase()}</p>{p.featured && <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-bold tracking-wider text-signal">MOST CHOSEN</span>}</div>
              <h3 className={`mt-6 font-display text-4xl ${p.featured ? "text-[#ffffff]" : "text-ink"}`}>{p.name}</h3>
              <p className={`mt-2 text-sm ${p.featured ? "text-[#f1ccd0]" : "text-mute"}`}>{p.price}</p>
              <ul className="mt-7 flex-1 space-y-3">{p.points.map((pt) => <li key={pt} className={`flex items-start gap-3 text-sm ${p.featured ? "text-[#f7e6e8]" : "text-ink"}`}><LineIcon name="check" className={`mt-0.5 h-4 w-4 shrink-0 ${p.featured ? "text-[#ef9aa4]" : "text-brand"}`} />{pt}</li>)}</ul>
              <Link href="/signup" className={`lp-shine mt-9 inline-flex min-h-[48px] items-center justify-center rounded-full text-[11px] font-semibold tracking-[.1em] transition ${p.featured ? "bg-white text-brand-deep hover:bg-brand-soft" : "bg-brand text-[#ffffff] hover:bg-brand-deep"}`}>REQUEST A QUOTE</Link>
            </article>
          ))}
        </div>
      </section>

      <footer id="contact" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20">
          <div className="flex flex-col justify-between gap-8 border-b border-line pb-10 md:flex-row md:items-end">
            <div><Link href="/" className="senso-wordmark text-2xl">TAPMENU</Link><p className="mt-4 max-w-sm text-sm leading-6 text-mute">A more memorable menu. A more connected restaurant. Every table starts with a tap.</p></div>
            <div className="flex flex-wrap gap-x-7 gap-y-3 text-[11px] font-medium tracking-[.14em] text-mute">
              <Link href={menuHref} className="hover:text-brand">DEMO MENU</Link><Link href="/signup" className="hover:text-brand">REQUEST ACCESS</Link><Link href="/login" className="hover:text-brand">LOG IN</Link><a href="#platform" className="hover:text-brand">PLATFORM</a><a href="#pricing" className="hover:text-brand">PRICING</a>
            </div>
          </div>
          <div className="flex flex-col justify-between gap-3 pt-6 text-[10px] tracking-[.1em] text-mute sm:flex-row"><span>© {new Date().getFullYear()} TAPMENU. ALL RIGHTS RESERVED.</span><span>MADE FOR BETTER DINING.</span></div>
        </div>
      </footer>
    </main>
  );
}
