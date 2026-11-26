import Link from "next/link";

export const dynamic = "force-dynamic";

const highlights = [
  { icon: "✳", title: "LOCALLY SOURCED", body: "We use the freshest local ingredients in every dish." },
  { icon: "♧", title: "CULINARY ARTISTRY", body: "Our chefs craft each plate with passion and precision." },
  { icon: "♜", title: "FINEST SELECTIONS", body: "An exceptional selection to complement your meal." },
];

export default function Home() {
  return (
    <main className="senso-page relative min-h-[100svh] overflow-hidden text-[#eee8dc]">
      <div className="senso-backdrop" aria-hidden="true" />
      <div className="senso-vignette" aria-hidden="true" />
      <div className="relative z-10 flex min-h-[100svh] items-center justify-center px-3 py-5 sm:px-7 sm:py-8 lg:px-12">
        <div className="senso-frame relative flex min-h-[min(82vh,850px)] w-full max-w-[1440px] flex-col overflow-hidden">
          <header className="relative z-20 flex items-center justify-between gap-4 px-6 py-6 sm:px-10 lg:px-14 lg:py-7">
            <Link href="/" className="senso-wordmark text-2xl tracking-[.28em] sm:text-[1.65rem]">SENSO</Link>
            <nav className="hidden items-center gap-7 text-[9px] font-medium tracking-[.12em] text-white/65 lg:flex xl:gap-10">
              <a href="#home" className="transition hover:text-[#d8ad6a]">HOME</a>
              <a href="#about" className="transition hover:text-[#d8ad6a]">ABOUT</a>
              <Link href="/r/ember-crust?table=T04" className="transition hover:text-[#d8ad6a]">MENU</Link>
              <a href="#reserve" className="transition hover:text-[#d8ad6a]">RESERVATIONS</a>
              <a href="#private-dining" className="transition hover:text-[#d8ad6a]">PRIVATE DINING</a>
              <a href="#contact" className="transition hover:text-[#d8ad6a]">CONTACT</a>
            </nav>
            <Link href="/r/ember-crust?table=T04" className="senso-gold-button shrink-0 px-4 py-3 text-[9px] font-semibold tracking-[.08em] sm:px-6">RESERVE A TABLE</Link>
          </header>

          <section id="home" className="senso-hero relative flex flex-1 items-center overflow-hidden px-6 pb-12 pt-12 sm:px-10 lg:px-14 lg:py-12">
            <div className="senso-dish-photo" role="img" aria-label="Fine dining steak served on a ceramic plate" />
            <div className="senso-photo-shade" />
            <div className="relative z-10 max-w-[470px] py-10 lg:py-14">
              <p className="mb-5 text-[9px] font-semibold tracking-[.14em] text-[#b99562] sm:text-[10px]">MODERN ITALIAN CUISINE</p>
              <h1 className="senso-heading text-[3.3rem] leading-[.99] tracking-[-.045em] sm:text-6xl lg:text-[4.2rem]">Savor Life’s<br /><em>Finest Moments</em></h1>
              <p className="mt-7 max-w-[340px] text-[12px] leading-[1.9] text-[#c8c2b9]/75 sm:text-[13px]">At Senso, we blend traditional Italian flavors with modern culinary artistry. Every dish is crafted with the finest ingredients for an unforgettable dining experience.</p>
              <div className="mt-8 flex flex-wrap items-center gap-7">
                <Link href="/r/ember-crust?table=T04" className="senso-gold-button px-6 py-4 text-[9px] font-semibold tracking-[.08em]">VIEW MENU</Link>
                <a href="#about" className="group inline-flex items-center gap-3 text-[9px] font-semibold tracking-[.09em] text-white/85">WATCH OUR STORY <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/70 text-[9px] transition group-hover:border-[#d5ad70] group-hover:bg-[#d5ad70] group-hover:text-black">▶</span></a>
              </div>
            </div>
          </section>

          <section id="about" className="senso-highlights grid grid-cols-1 border-t border-white/[.12] sm:grid-cols-3">
            {highlights.map((item, i) => <div key={item.title} className={`flex items-center gap-5 px-7 py-6 sm:px-8 lg:px-10 ${i ? "border-t border-white/[.10] sm:border-l sm:border-t-0" : ""}`}>
              <span className="senso-line-icon flex h-10 w-10 shrink-0 items-center justify-center text-[27px] text-[#a98653]">{item.icon}</span>
              <div><p className="text-[9px] font-semibold tracking-[.13em] text-[#d4c4ac]">{item.title}</p><p className="mt-2 max-w-[220px] text-[10px] leading-[1.7] text-white/45">{item.body}</p></div>
            </div>)}
          </section>
        </div>
      </div>
      <footer id="contact" className="sr-only"><span id="reserve">Reservations</span><span id="private-dining">Private dining</span></footer>
    </main>
  );
}
