import Link from "next/link";
import Hero3D from "@/components/landing/Hero3D";

function LineIcon({ name, className = "" }: { name: string; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    spark: <><path d="M12 2.8 14.4 9.6 21.2 12l-6.8 2.4L12 21.2l-2.4-6.8L2.8 12l6.8-2.4L12 2.8Z"/><path d="m19 2 .7 2.3L22 5l-2.3.7L19 8l-.7-2.3L16 5l2.3-.7L19 2Z"/></>,
    leaf: <><path d="M20.5 3.5C11 3.5 5 6.6 5 13a6 6 0 0 0 6 6c6.4 0 9.5-6 9.5-15.5Z"/><path d="M4 21c3.2-5 7.2-8.7 12-11"/></>,
    plate: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="5.2"/><path d="M3 4v5M1.5 6.5h3M21 4v7M19.5 11h3"/></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>,
    sliders: <><path d="M4 7h9m4 0h3M4 17h3m4 0h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/></>,
    nfc: <><path d="M5 8a6 6 0 0 1 0 8M8 5a10 10 0 0 1 0 14M11 2a14 14 0 0 1 0 20"/><rect x="14" y="7" width="7" height="10" rx="1.5"/></>,
    bolt: <><path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/></>,
    chef: <><path d="M6 11a4 4 0 1 1 7.5-2A4.5 4.5 0 1 1 19 14v5H6v-8Z"/><path d="M9 19v2h9v-2"/></>
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" className={className} {...common}>{paths[name] ?? paths.spark}</svg>;
}

export const dynamic = "force-dynamic";

const highlights = [
  { icon: "leaf", title: "LOCALLY SOURCED", body: "Fresh ingredients, beautifully presented and easy to explore." },
  { icon: "spark", title: "CULINARY ARTISTRY", body: "Every dish deserves its own moment in the spotlight." },
  { icon: "plate", title: "A BETTER TABLE", body: "A seamless experience from the first tap to the final bite." },
];
const features = [
  ["01", "A menu worth looking at", "Bring dishes to life with rich photography and interactive 3D previews. Let guests explore every detail before they order."],
  ["02", "Make it exactly how you like", "Sizes, toppings, sauces, add-ons and removals. Guests personalise dishes while prices update instantly."],
  ["03", "One tap opens everything", "Connect NFC cards and table tags to your branded restaurant menu. No app download and no complicated guest signup."],
  ["04", "Orders move in real time", "Send orders to the right kitchen station, keep staff informed and let guests follow their order status."],
];
const steps = [
  ["01", "Tap", "A guest taps the NFC card placed on their table."],
  ["02", "Discover", "Your digital menu opens instantly in their browser."],
  ["03", "Customise", "They explore dishes, choose options and build their order."],
  ["04", "Enjoy", "The order reaches your team and service keeps moving."],
];
const roles = [
  ["GUEST EXPERIENCE", "A menu guests remember", "Beautiful menus, interactive dishes, clear prices and effortless ordering."],
  ["OWNER STUDIO", "Your restaurant, your rules", "Manage dishes, modifiers, prices, tables, NFC cards, staff and offers."],
  ["KITCHEN DISPLAY", "Every ticket in the right place", "Organise incoming orders by station with clear modifiers and live status."],
  ["TEAM OPERATIONS", "A floor that stays in sync", "Help staff track orders, table requests and service progress."],
];

export default function Home() {
  const demo = process.env.TAPMENU_SEED_DEMO !== "false";
  return (
    <main className="senso-page relative overflow-hidden text-[#eee8dc]">
      <div className="senso-backdrop" aria-hidden="true" />
      <div className="senso-vignette" aria-hidden="true" />
      <header className="senso-nav fixed inset-x-0 top-0 z-50 border-b border-white/[.08]">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-12">
          <Link href="/" className="senso-wordmark text-xl tracking-[.28em] sm:text-2xl">TAPMENU</Link>
          <nav className="hidden items-center gap-7 text-[9px] font-medium tracking-[.14em] text-white/65 lg:flex">
            <a href="#home" className="hover:text-[#e45b65]">HOME</a><a href="#experience" className="hover:text-[#e45b65]">EXPERIENCE</a><a href="#platform" className="hover:text-[#e45b65]">PLATFORM</a><a href="#how" className="hover:text-[#e45b65]">HOW IT WORKS</a><a href="#pricing" className="hover:text-[#e45b65]">PRICING</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="px-2 py-2 text-[10px] tracking-[.12em] text-white/75 transition hover:text-white sm:text-xs">LOG IN</Link>
            <Link href="/signup" className="senso-red-button px-4 py-3 text-[9px] font-semibold tracking-[.08em] sm:px-6">GET STARTED</Link>
          </div>
        </div>
      </header>

      <div className="relative z-10">
        <section id="home" className="mx-auto flex min-h-[100svh] max-w-[1600px] items-center px-3 pb-8 pt-24 sm:px-7 sm:pt-28 lg:px-12">
          <div className="senso-frame relative mx-auto flex min-h-[min(82vh,850px)] w-full max-w-[1440px] flex-col overflow-hidden">
            <div className="senso-hero relative flex flex-1 items-center overflow-hidden px-6 pb-12 pt-12 sm:px-10 lg:px-14 lg:py-12">
              <div className="senso-dish-photo" role="img" aria-label="Fine dining dish served on a ceramic plate" />
              <div className="senso-photo-shade" />\n              <div className="tm-hero-model" aria-label="Interactive three-dimensional pizza preview"><div className="tm-model-orbit tm-orbit-one" /><div className="tm-model-orbit tm-orbit-two" /><div className="tm-model-glow" /><div className="tm-model-canvas"><Hero3D /></div><div className="tm-model-caption"><span className="tm-live-dot" /> LIVE 3D PREVIEW <span className="tm-caption-divider" /> ROTATE & EXPLORE</div></div>
              <div className="relative z-10 max-w-[490px] py-10 lg:py-14">
                <p className="mb-5 text-[9px] font-semibold tracking-[.18em] text-[#e56a70] sm:text-[10px]">THE NEXT CHAPTER OF DINING</p>
                <h1 className="senso-heading text-[3.4rem] leading-[.99] tracking-[-.045em] sm:text-6xl lg:text-[4.6rem]">Every Table.<br /><em>Something Special.</em></h1>
                <p className="mt-7 max-w-[360px] text-[12px] leading-[1.95] text-[#c8c2b9]/75 sm:text-[13px]">A simple tap opens a world of flavour. Give your guests a beautifully branded digital menu, interactive 3D dishes and a smoother way to order.</p>
                <div className="mt-8 flex flex-wrap items-center gap-5">
                  <Link href={demo ? "/r/ember-crust?table=T04" : "/signup"} className="senso-red-button px-6 py-4 text-[9px] font-semibold tracking-[.1em]">EXPLORE LIVE MENU</Link>
                  <Link href="/signup" className="group inline-flex items-center gap-3 text-[9px] font-semibold tracking-[.1em] text-white/85">CREATE YOUR RESTAURANT <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/70 text-[9px] transition group-hover:border-[#d84b56] group-hover:bg-[#d84b56]">↗</span></Link>
                </div>
                <div className="mt-8 flex flex-wrap gap-5 text-[9px] tracking-[.15em] text-white/35"><span>NFC ENABLED</span><span>·</span><span>INTERACTIVE 3D</span><span>·</span><span>LIVE ORDERS</span></div>
              </div>
            </div>
            <section className="senso-highlights grid grid-cols-1 border-t border-white/[.12] sm:grid-cols-3">
              {highlights.map((item, i) => <div key={item.title} className={`flex items-center gap-5 px-7 py-6 sm:px-8 lg:px-10 ${i ? "border-t border-white/[.10] sm:border-l sm:border-t-0" : ""}`}>
                <span className="senso-line-icon flex h-10 w-10 shrink-0 items-center justify-center text-[#e35a69]"><LineIcon name={item.icon} className="h-[19px] w-[19px]" /></span>
                <div><p className="text-[9px] font-semibold tracking-[.13em] text-[#e4c9c5]">{item.title}</p><p className="mt-2 max-w-[220px] text-[10px] leading-[1.7] text-white/45">{item.body}</p></div>
              </div>)}
            </section>
          </div>
        </section>

        <section id="experience" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
          <p className="text-[10px] tracking-[.25em] text-[#e56a70]">01 — THE GUEST EXPERIENCE</p>
          <div className="mt-5 grid gap-7 md:grid-cols-[1.1fr_.9fr] md:items-end"><h2 className="senso-heading text-5xl leading-[1.02] sm:text-7xl">A menu that feels<br /><em>like an invitation.</em></h2><p className="max-w-lg text-sm leading-7 text-white/50">Paper menus show a list. TapMenu creates a moment. Give every guest the freedom to discover dishes, understand every option and order at their own pace.</p></div>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">{features.map(([n,t,d])=><article key={n} className="senso-section-card group min-h-[220px] p-7 sm:p-9"><div className="flex items-center justify-between"><span className="senso-heading text-4xl text-white/20">{n}</span><span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#d94b5d]/25 bg-[#a72b40]/10 text-[#ed7884] transition group-hover:rotate-45 group-hover:shadow-[0_0_24px_rgba(215,63,85,.22)]"><LineIcon name={n === "01" ? "spark" : n === "02" ? "sliders" : n === "03" ? "nfc" : "bolt"} className="h-5 w-5" /></span></div><h3 className="senso-heading mt-9 text-3xl">{t}</h3><p className="mt-3 max-w-lg text-xs leading-6 text-white/48">{d}</p></article>)}</div>
        </section>

        <section id="platform" className="border-y border-white/[.09] bg-[#12090a]/90 px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr]">
            <div><p className="text-[10px] tracking-[.25em] text-[#e56a70]">02 — ONE CONNECTED PLATFORM</p><h2 className="senso-heading mt-5 text-5xl leading-[1.03] sm:text-7xl">Beautiful up front.<br /><em>Powerful behind it.</em></h2><p className="mt-6 max-w-md text-sm leading-7 text-white/50">The guest sees a seamless menu. Your team gets the tools to run service: manage the menu, control pricing, receive orders and keep the kitchen moving.</p><Link href="/signup" className="senso-red-button mt-8 px-6 py-4 text-[9px] tracking-[.1em]">SET UP YOUR RESTAURANT</Link></div>
            <div className="grid gap-3 sm:grid-cols-2">{roles.map(([tag,title,body])=><div key={tag} className="senso-section-card p-7"><p className="text-[9px] tracking-[.18em] text-[#df7075]">{tag}</p><h3 className="senso-heading mt-7 text-2xl">{title}</h3><p className="mt-3 text-xs leading-6 text-white/45">{body}</p></div>)}</div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8 sm:py-32">
          <p className="text-[10px] tracking-[.25em] text-[#e56a70]">03 — AS EASY AS A TAP</p><h2 className="senso-heading mt-5 text-5xl sm:text-7xl">Four steps to <em>delight.</em></h2>
          <div className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{steps.map(([n,t,d])=><div key={n} className="senso-step p-7"><span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#d94b5d]/25 bg-[#a72b40]/10 text-[#ed7884]"><LineIcon name={n === "01" ? "nfc" : n === "02" ? "spark" : n === "03" ? "sliders" : "chef"} className="h-6 w-6" /></span><span className="ml-auto font-mono text-xs tracking-[.18em] text-white/25">{n}</span><h3 className="senso-heading mt-10 text-3xl">{t}</h3><p className="mt-3 text-xs leading-6 text-white/45">{d}</p></div>)}</div>
          <div className="mt-14 flex flex-col items-start justify-between gap-6 border-y border-white/10 py-8 sm:flex-row sm:items-center"><div><p className="text-[9px] tracking-[.2em] text-[#df7075]">NO APP DOWNLOAD REQUIRED</p><p className="senso-heading mt-2 text-3xl">One tap. Straight to your menu.</p></div><Link href={demo ? "/r/ember-crust?table=T04" : "/signup"} className="senso-red-button px-6 py-4 text-[9px] tracking-[.1em]">TRY THE DEMO MENU ↗</Link></div>
        </section>

        <section id="pricing" className="scroll-mt-24 border-y border-white/[.09] bg-black/35 px-5 py-24 sm:px-8 sm:py-32">
          <div className="mx-auto max-w-7xl"><p className="text-[10px] tracking-[.25em] text-[#e56a70]">04 — YOUR RESTAURANT, YOUR GROWTH</p><div className="mt-5 flex flex-col justify-between gap-6 md:flex-row md:items-end"><h2 className="senso-heading text-5xl sm:text-7xl">Ready for a<br /><em>better service?</em></h2><p className="max-w-md text-sm leading-7 text-white/45">Create your restaurant workspace to explore available plans, manage your menu and bring your tables online.</p></div>
            <div className="senso-section-card mt-12 flex flex-col justify-between gap-8 p-8 sm:flex-row sm:items-center sm:p-12"><div><p className="text-[9px] tracking-[.2em] text-[#df7075]">START YOUR TAPMENU EXPERIENCE</p><h3 className="senso-heading mt-4 text-4xl sm:text-5xl">Your next chapter starts here.</h3><p className="mt-4 max-w-xl text-xs leading-6 text-white/45">Sign up to create your restaurant, or log in to manage the one you already have.</p></div><div className="flex shrink-0 flex-wrap gap-3"><Link href="/signup" className="senso-red-button px-7 py-4 text-[9px] tracking-[.1em]">CREATE ACCOUNT</Link><Link href="/login" className="senso-outline-button px-7 py-4 text-[9px] tracking-[.1em]">LOG IN</Link></div></div>
          </div>
        </section>

        <footer id="contact" className="mx-auto max-w-7xl px-5 py-14 sm:px-8 sm:py-20"><div className="flex flex-col justify-between gap-8 border-b border-white/10 pb-10 md:flex-row md:items-end"><div><Link href="/" className="senso-wordmark text-2xl">TAPMENU</Link><p className="mt-4 max-w-sm text-xs leading-6 text-white/40">A more memorable menu. A more connected restaurant. Every table starts with a tap.</p></div><div className="flex flex-wrap gap-x-7 gap-y-3 text-[9px] tracking-[.16em] text-white/55"><Link href="/r/ember-crust?table=T04" className="hover:text-white">DEMO MENU</Link><Link href="/signup" className="hover:text-white">SIGN UP</Link><Link href="/login" className="hover:text-white">LOG IN</Link><a href="#platform" className="hover:text-white">PLATFORM</a><a href="#pricing" className="hover:text-white">PRICING</a></div></div><div className="flex flex-col justify-between gap-3 pt-6 text-[9px] tracking-[.1em] text-white/30 sm:flex-row"><span>© {new Date().getFullYear()} TAPMENU. ALL RIGHTS RESERVED.</span><span>MADE FOR MEMORABLE DINING.</span></div></footer>
      </div>
    </main>
  );
}
