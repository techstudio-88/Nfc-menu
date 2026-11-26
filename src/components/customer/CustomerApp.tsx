"use client";
import { AnimatePresence, motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MenuItemFull, MenuTree } from "@/lib/orders";
import { api } from "@/lib/client";
import { LANGS, t as dict, type Dict } from "@/lib/i18n";
import { formatMoney, tr, trDesc } from "@/lib/pricing";
import DishSheet, { type CartLine } from "./DishSheet";

type PublicMenu = {
  restaurant: { name: string; slug: string; tagline: string; logoUrl: string | null; coverUrl: string | null; primaryColor: string; accentColor: string; theme: string; defaultLanguage: string; languages: string[] };
  suspended: boolean;
  settings?: { currency: string; taxRateBps: number; taxLabel: string; serviceChargeBps: number; feeCents: number; feeLabel: string; autoDiscountBps: number; orderingEnabled: boolean; paymentMethods: string[] };
  table?: { status: string; code?: string };
  menu?: MenuTree;
};

const THEMES: Record<string, Record<string, string>> = {
  noir: { "--bg": "#0b0b0b", "--fg": "#f5f1ea", "--muted": "#a39b8f", "--card": "#151413", "--line": "rgba(255,255,255,.11)" },
  ember: { "--bg": "#120a06", "--fg": "#fbefe2", "--muted": "#b69a85", "--card": "#1d110b", "--line": "rgba(255,170,90,.2)" },
  ivory: { "--bg": "#faf6ee", "--fg": "#1f1a14", "--muted": "#7a6f61", "--card": "#fffdf8", "--line": "rgba(0,0,0,.12)" },
};
const lum = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
};
const EMOJI: Record<string, string> = { pizza: "🍕", burger: "🍔", pasta: "🍝", drink: "🥤", dessert: "🍰", generic: "🍽️" };

export default function CustomerApp({ slug, table, card }: { slug: string; table?: string; card?: string }) {
  const router = useRouter();
  const [data, setData] = useState<PublicMenu | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState("en");
  const [lite, setLite] = useState(false);
  const [intro, setIntro] = useState(true);
  const [minIntro, setMinIntro] = useState(false);
  const [cat, setCat] = useState<string>("");
  const [dish, setDish] = useState<MenuItemFull | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [added, setAdded] = useState<{ id: number; name: string } | null>(null);
  const [assistOpen, setAssistOpen] = useState(false);
  const [assistMsg, setAssistMsg] = useState("");
  const [manualTable, setManualTable] = useState("");
  const [lastOrder, setLastOrder] = useState<string | null>(null);
  const hydrated = useRef(false);

  /* settings & persistence */
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const low = (nav.deviceMemory ?? 8) <= 2 || (navigator.hardwareConcurrency ?? 8) <= 2;
    const stored = localStorage.getItem("tm-lite");
    setLite(stored !== null ? stored === "1" : reduce || low);
    setLang(localStorage.getItem(`tm-lang-${slug}`) ?? "");
    try {
      setCart(JSON.parse(localStorage.getItem(`tm-cart-${slug}`) ?? "[]"));
    } catch {
      /* ignore */
    }
    setManualTable(localStorage.getItem(`tm-table-${slug}`) ?? "");
    const lo = localStorage.getItem(`tm-last-${slug}`);
    if (lo) {
      const [tok, ts] = lo.split("|");
      if (Date.now() - Number(ts) < 4 * 3600_000) setLastOrder(tok);
    }
    const seen = sessionStorage.getItem(`tm-intro-${slug}`);
    if (seen || reduce) {
      setIntro(false);
      setMinIntro(true);
    } else {
      setTimeout(() => setMinIntro(true), 2300);
    }
    hydrated.current = true;
  }, [slug]);
  useEffect(() => {
    if (hydrated.current) localStorage.setItem(`tm-cart-${slug}`, JSON.stringify(cart));
  }, [cart, slug]);

  /* data (live availability: refetch every 30s + on focus) */
  const load = useCallback(async () => {
    try {
      const qs = new URLSearchParams();
      if (table) qs.set("table", table);
      if (card) qs.set("c", card);
      const d = await api<PublicMenu>(`/api/public/menu/${slug}?${qs}`);
      setData(d);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load menu");
    }
  }, [slug, table, card]);
  useEffect(() => {
    void load();
    const i = setInterval(load, 30000);
    const v = () => !document.hidden && load();
    document.addEventListener("visibilitychange", v);
    return () => {
      clearInterval(i);
      document.removeEventListener("visibilitychange", v);
    };
  }, [load]);

  useEffect(() => {
    if (!data) return;
    const l = lang && data.restaurant.languages.includes(lang) ? lang : data.restaurant.defaultLanguage;
    if (l !== lang) setLang(l);
    document.documentElement.lang = l;
    document.documentElement.dir = LANGS[l]?.dir ?? "ltr";
    return () => {
      document.documentElement.dir = "ltr";
      document.documentElement.lang = "en";
    };
  }, [data, lang]);

  const T: Dict = useMemo(() => dict(lang || "en"), [lang]);
  const items = data?.menu?.items ?? [];
  const cats = useMemo(() => {
    const m = data?.menu;
    if (!m) return [];
    const list = m.categories.filter((c) => m.items.some((i) => i.categoryId === c.id)).map((c) => ({ id: c.id, name: tr(c, lang), desc: trDesc({ description: c.description, translations: c.translations }, lang) }));
    if (m.items.some((i) => i.featured)) list.unshift({ id: "__picks", name: "★ " + T.picks, desc: "" });
    return list;
  }, [data, lang, T.picks]);
  useEffect(() => {
    if (cats.length && !cats.some((c) => c.id === cat)) setCat(cats[0].id);
  }, [cats, cat]);

  const visible = useMemo(() => (cat === "__picks" ? items.filter((i) => i.featured) : items.filter((i) => i.categoryId === cat)), [items, cat]);
  const count = cart.reduce((a, l) => a + l.qty, 0);
  const brandPrimary = data?.restaurant.primaryColor ?? "#f59e0b";
  const style = useMemo(
    () =>
      ({
        ...(THEMES[data?.restaurant.theme ?? "noir"] ?? THEMES.noir),
        "--brand": brandPrimary,
        "--accent": data?.restaurant.accentColor ?? "#ea580c",
        "--on-brand": lum(brandPrimary) > 0.6 ? "#16110b" : "#ffffff",
      }) as React.CSSProperties,
    [data, brandPrimary],
  );

  const addLine = (l: CartLine) => {
    setCart((c) => {
      const ex = c.find((x) => x.key === l.key);
      return ex ? c.map((x) => (x.key === l.key ? { ...x, qty: Math.min(50, x.qty + l.qty) } : x)) : [...c, l];
    });
    setDish(null);
    setAdded({ id: Date.now(), name: l.name });
    setTimeout(() => setAdded(null), 1800);
  };

  const setLanguage = (l: string) => {
    setLang(l);
    localStorage.setItem(`tm-lang-${slug}`, l);
  };

  const tableCode = data?.table?.status === "ok" ? data.table.code : manualTable.trim().toUpperCase() || undefined;
  const cardBlocked = data?.table?.status === "card_inactive";

  const sendAssist = async (kind: string) => {
    try {
      await api("/api/public/assist", { body: { slug, tableCode, cardToken: card, kind } });
      setAssistMsg(T.assistSent);
    } catch (e) {
      setAssistMsg(e instanceof Error ? e.message : "Failed");
    }
    setTimeout(() => {
      setAssistMsg("");
      setAssistOpen(false);
    }, 2200);
  };

  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 320], [0, 90]);
  const heroO = useTransform(scrollY, [0, 280], [1, 0.15]);

  /* ───── states ───── */
  if (err && !data) {
    return (
      <div className="grid min-h-dvh place-items-center bg-neutral-950 p-6 text-center">
        <div>
          <p className="font-display text-3xl text-white">Menu unavailable</p>
          <p className="mt-2 text-sm text-neutral-400">{err}</p>
          <button onClick={load} className="mt-5 rounded-full bg-amber-500 px-6 py-2.5 font-medium text-black">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const showIntro = intro && (!data || !minIntro || true);
  const introDone = !!data && minIntro;

  return (
    <div style={style} data-lite={lite ? "1" : "0"} className="c-bg c-fg relative min-h-dvh overflow-x-clip pb-32">
      <AnimatePresence>
        {showIntro && !introDone && <Intro key="intro" data={data} T={T} table={tableCode} lite={lite} onSkip={() => data && setMinIntro(true)} />}
      </AnimatePresence>
      <IntroGate done={introDone} onDone={() => { setIntro(false); sessionStorage.setItem(`tm-intro-${slug}`, "1"); }} />

      {data?.suspended ? (
        <div className="grid min-h-dvh place-items-center p-8 text-center">
          <div>
            <p className="font-display text-4xl">{data.restaurant.name}</p>
            <p className="c-muted mt-3">{T.suspended}</p>
          </div>
        </div>
      ) : data ? (
        <>
          {/* hero */}
          <header className="relative isolate overflow-hidden px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))]">
            {data.restaurant.coverUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.restaurant.coverUrl} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover opacity-30" />
            )}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(80%_70%_at_50%_-10%,color-mix(in_srgb,var(--brand)_32%,transparent),transparent_70%)]" />
            <div className="absolute inset-x-0 bottom-0 -z-10 h-24 bg-gradient-to-t from-[var(--bg)] to-transparent" />
            <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                {data.restaurant.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={data.restaurant.logoUrl} alt="" className="h-9 w-9 rounded-full object-cover ring-1 ring-white/20" />
                ) : (
                  <span className="c-brand-grad grid h-9 w-9 place-items-center rounded-full font-display text-lg">{data.restaurant.name[0]}</span>
                )}
                {tableCode ? (
                  <span className="glass rounded-full px-3 py-1.5 font-medium">
                    {T.table} <span className="c-brand">{tableCode}</span>
                  </span>
                ) : (
                  <span className="glass rounded-full px-3 py-1.5">{T.needTable}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {data.restaurant.languages.length > 1 && (
                  <select aria-label={T.language} value={lang} onChange={(e) => setLanguage(e.target.value)} className="glass rounded-full bg-transparent px-3 py-1.5 outline-none">
                    {data.restaurant.languages.map((l) => (
                      <option key={l} value={l} className="text-black">
                        {LANGS[l]?.name ?? l}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => {
                    setLite((v) => {
                      localStorage.setItem("tm-lite", v ? "0" : "1");
                      return !v;
                    });
                  }}
                  aria-pressed={lite}
                  title={T.lite}
                  className={`glass rounded-full px-3 py-1.5 ${lite ? "c-brand" : ""}`}
                >
                  {lite ? "⚡ " : "✨ "}
                  {T.lite}
                </button>
                <button onClick={() => setAssistOpen((v) => !v)} aria-label={T.assist} aria-expanded={assistOpen} className="glass grid h-9 w-9 place-items-center rounded-full">
                  🛎
                </button>
              </div>
            </div>
            <AnimatePresence>
              {assistOpen && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="glass mx-auto mt-3 max-w-3xl rounded-2xl p-3">
                  {assistMsg ? (
                    <p className="p-2 text-center text-sm">✓ {assistMsg}</p>
                  ) : !tableCode ? (
                    <p className="p-2 text-sm">{T.needTable}</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {[
                        ["waiter", T.needWaiter],
                        ["bill", T.needBill],
                        ["water", T.needWater],
                      ].map(([k, label]) => (
                        <button key={k} onClick={() => sendAssist(k)} className="rounded-xl border c-line p-3 hover:bg-white/10">
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <motion.div style={lite ? undefined : { y: heroY, opacity: heroO }} className="mx-auto mt-10 max-w-3xl">
              <p className="c-muted text-[11px] uppercase tracking-[0.35em]">{T.welcome}</p>
              <h1 className="font-display mt-2 text-5xl leading-[0.95] sm:text-7xl">{data.restaurant.name}</h1>
              {data.restaurant.tagline && <p className="c-muted mt-3 max-w-md text-base italic">{data.restaurant.tagline}</p>}
            </motion.div>
            {cardBlocked && <p className="mx-auto mt-5 max-w-3xl rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">This NFC card has been deactivated — you can browse the menu, but ordering is disabled.</p>}
            {!data.settings?.orderingEnabled && <p className="mx-auto mt-5 max-w-3xl rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-100">{T.paused}</p>}
          </header>

          {/* category navigation */}
          <nav className="sticky top-0 z-30 border-y c-line bg-[color-mix(in_srgb,var(--bg)_82%,transparent)] backdrop-blur-xl" aria-label="Categories">
            <div className="no-scrollbar mx-auto flex max-w-3xl gap-1 overflow-x-auto px-3">
              {cats.map((c) => (
                <button key={c.id} onClick={() => setCat(c.id)} aria-current={cat === c.id} className={`relative shrink-0 px-4 py-3.5 text-sm font-medium transition ${cat === c.id ? "c-fg" : "c-muted"}`}>
                  {c.name}
                  {cat === c.id && <motion.span layoutId="catline" className="c-brand-bg absolute inset-x-3 bottom-0 h-0.5 rounded-full" />}
                </button>
              ))}
            </div>
          </nav>

          <main className="mx-auto max-w-3xl px-4 pt-6" style={{ perspective: 1400 }}>
            {cats.length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-display text-3xl">Menu coming soon</p>
                <p className="c-muted mt-2 text-sm">This restaurant hasn’t published any dishes yet.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={cat}
                  initial={lite ? { opacity: 0 } : { opacity: 0, rotateX: -14, y: 40, scale: 0.97 }}
                  animate={{ opacity: 1, rotateX: 0, y: 0, scale: 1 }}
                  exit={lite ? { opacity: 0 } : { opacity: 0, rotateX: 10, y: -24, scale: 0.97 }}
                  transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
                  style={{ transformOrigin: "50% 0%" }}
                  className="grid gap-6 sm:grid-cols-2"
                >
                  {visible.map((it, i) => (
                    <DishCard key={it.id} item={it} lang={lang} currency={data.settings!.currency} T={T} lite={lite} index={i} onOpen={() => setDish(it)} />
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </main>
          <footer className="c-muted mx-auto mt-16 max-w-3xl px-5 text-center text-xs">
            Powered by <span className="c-brand">TapMenu 3D</span> · tap, taste, repeat
          </footer>

          {/* floating bag */}
          <AnimatePresence>
            {count > 0 && !cartOpen && (
              <motion.button
                key="bag"
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                onClick={() => setCartOpen(true)}
                aria-label={`${T.bag}: ${count}`}
                className="c-brand-grad fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-md items-center justify-between rounded-full px-6 py-4 font-semibold shadow-[0_20px_50px_-12px_var(--brand)]"
              >
                <span className="flex items-center gap-3">
                  <motion.span key={count} initial={{ scale: 1.6, rotate: -12 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 500, damping: 14 }} className="grid h-7 min-w-7 place-items-center rounded-full bg-black/25 px-1.5 text-sm">
                    {count}
                  </motion.span>
                  {T.bag}
                </span>
                <span className="tabular-nums">{formatMoney(cart.reduce((a, l) => a + l.unitPrice * l.qty, 0), data.settings!.currency)}</span>
              </motion.button>
            )}
          </AnimatePresence>
          {count === 0 && lastOrder && (
            <Link href={`/r/${slug}/track/${lastOrder}`} className="glass fixed bottom-5 left-1/2 z-40 -translate-x-1/2 rounded-full px-5 py-3 text-sm font-medium">
              📍 Track my order
            </Link>
          )}
          <AnimatePresence>
            {added && (
              <motion.div key={added.id} initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10 }} className="glass fixed left-1/2 top-5 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-full px-5 py-3 text-sm shadow-2xl" role="status">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--brand)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6" style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: "drawcheck .5s .1s forwards" }} />
                </svg>
                {T.addedToBag}: {added.name}
              </motion.div>
            )}
            {added && !lite && (
              <motion.span key={"fly" + added.id} initial={{ x: 0, y: 0, scale: 1, opacity: 1 }} animate={{ x: "28vw", y: "38vh", scale: 0.15, opacity: 0.1 }} transition={{ duration: 0.8, ease: "easeIn" }} className="c-brand-grad pointer-events-none fixed left-1/2 top-1/2 z-[70] h-10 w-10 rounded-full" />
            )}
          </AnimatePresence>

          <AnimatePresence>{dish && <DishSheet key={dish.id} item={dish} lang={lang} currency={data.settings!.currency} T={T} lite={lite} onClose={() => setDish(null)} onAdd={addLine} />}</AnimatePresence>
          <AnimatePresence>
            {cartOpen && (
              <CartDrawer
                slug={slug}
                data={data}
                T={T}
                lang={lang}
                cart={cart}
                setCart={setCart}
                tableCode={tableCode}
                cardToken={card}
                blocked={cardBlocked || !data.settings?.orderingEnabled}
                onTable={(v) => {
                  setManualTable(v);
                  localStorage.setItem(`tm-table-${slug}`, v);
                }}
                manualTable={manualTable}
                onClose={() => setCartOpen(false)}
                onPlaced={(tok) => {
                  setCart([]);
                  localStorage.setItem(`tm-last-${slug}`, `${tok}|${Date.now()}`);
                  router.push(`/r/${slug}/track/${tok}?new=1`);
                }}
              />
            )}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}

/* dismisses the intro layer once data + minimum time are done */
function IntroGate({ done, onDone }: { done: boolean; onDone: () => void }) {
  useEffect(() => {
    if (done) onDone();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);
  return null;
}

function Intro({ data, T, table, lite, onSkip }: { data: PublicMenu | null; T: Dict; table?: string; lite: boolean; onSkip: () => void }) {
  return (
    <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-[#070605]" exit={{ opacity: 0, scale: 1.08 }} transition={{ duration: 0.7, ease: "easeInOut" }} onClick={onSkip} role="status" aria-label="Loading menu">
      <div className="absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_45%,rgba(251,146,60,.22),transparent)]" />
      <motion.div className="absolute inset-y-0 left-0 w-1/2 bg-[#0d0b09]" initial={{ x: 0 }} exit={{ x: "-100%" }} transition={{ duration: 0.9, delay: 0.1, ease: [0.77, 0, 0.18, 1] }} />
      <motion.div className="absolute inset-y-0 right-0 w-1/2 bg-[#0d0b09]" initial={{ x: 0 }} exit={{ x: "100%" }} transition={{ duration: 0.9, delay: 0.1, ease: [0.77, 0, 0.18, 1] }} />
      <div className="relative z-10 px-6 text-center">
        <motion.p initial={{ opacity: 0, letterSpacing: "0.1em" }} animate={{ opacity: 1, letterSpacing: "0.4em" }} transition={{ duration: 1.2 }} className="text-[11px] uppercase text-amber-200/70">
          {T.welcome}
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 24, filter: "blur(10px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 1, delay: 0.25 }} className="font-display gold-text mt-4 text-5xl sm:text-7xl">
          {data?.restaurant.name ?? "\u00a0"}
        </motion.h1>
        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 1.1, delay: 0.6 }} className="mx-auto mt-6 h-px w-48 origin-center bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }} className="mt-5 text-sm text-neutral-400">
          {table ? `${T.table} ${table}` : "\u00a0"}
        </motion.p>
        {!lite && (
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 9, ease: "linear" }} className="mx-auto mt-8 h-14 w-14 rounded-full border border-amber-400/30 border-t-amber-300" />
        )}
        <p className="mt-6 text-[11px] text-neutral-600">{T.tapToSkip}</p>
      </div>
    </motion.div>
  );
}

/* ───────── floating dish card with pointer parallax ───────── */
function DishCard({ item, lang, currency, T, lite, index, onOpen }: { item: MenuItemFull; lang: string; currency: string; T: Dict; lite: boolean; index: number; onOpen: () => void }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), { stiffness: 200, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-11, 11]), { stiffness: 200, damping: 20 });
  const px = useTransform(mx, [-0.5, 0.5], [-10, 10]);
  const py = useTransform(my, [-0.5, 0.5], [-8, 8]);
  const ref = useRef<HTMLButtonElement>(null);
  const custom = item.variants.length > 0 || item.groups.length > 0;
  const has3d = item.visual !== "generic" || !!item.modelUrl;
  const from = item.variants.length ? Math.min(...item.variants.filter((v) => v.available).map((v) => v.priceDelta), 0) + item.basePrice : item.basePrice;

  return (
    <motion.button
      ref={ref}
      onClick={onOpen}
      aria-label={`${tr(item, lang)} — ${formatMoney(from, currency)}`}
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: lite ? 0 : 0.08 * index, duration: 0.5 }}
      onPointerMove={(e) => {
        if (lite || e.pointerType === "touch") return;
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      style={lite ? undefined : { rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      whileTap={{ scale: 0.985 }}
      className={`c-card group relative overflow-hidden rounded-[1.75rem] border c-line text-left transition-shadow hover:shadow-[0_30px_60px_-30px_var(--brand)] ${!item.availableNow ? "opacity-60" : ""}`}
    >
      <div className="relative aspect-[5/4] overflow-hidden">
        <motion.div style={lite ? undefined : { x: px, y: py, scale: 1.12 }} className="absolute inset-0">
          {item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt="" loading="lazy" className={`h-full w-full object-cover transition duration-700 group-hover:scale-105 ${!item.availableNow ? "grayscale" : ""}`} />
          ) : (
            <div className="grid h-full place-items-center bg-gradient-to-br from-amber-900/40 to-black text-7xl">{EMOJI[item.visual]}</div>
          )}
        </motion.div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        <div className="absolute left-3 top-3 flex gap-1.5 text-[10px] font-semibold uppercase tracking-wider">
          {has3d && <span className="c-brand-bg rounded-full px-2.5 py-1">3D · AR</span>}
          {custom && <span className="glass rounded-full px-2.5 py-1 text-white">{T.customise}</span>}
        </div>
        {!item.availableNow && <span className="absolute right-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-semibold uppercase text-white">{T.soldOut}</span>}
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between" style={lite ? undefined : { transform: "translateZ(40px)" }}>
          <h3 className="font-display text-2xl leading-none text-white drop-shadow-lg">{tr(item, lang)}</h3>
          <span className="c-brand-grad rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums">
            {item.variants.length ? "from " : ""}
            {formatMoney(from, currency)}
          </span>
        </div>
      </div>
      <p className="c-muted line-clamp-2 px-4 py-3.5 text-sm leading-relaxed">{trDesc(item, lang)}</p>
    </motion.button>
  );
}

/* ───────── cart & checkout ───────── */
type Quote = { lines: { itemId: string; unitPrice: number; qty: number; lineTotal: number; errors: string[] }[]; errors: string[]; totals: { subtotal: number; discount: number; tax: number; serviceCharge: number; fees: number; total: number }; couponError: string | null; couponApplied: string | null };

function CartDrawer({
  slug,
  data,
  T,
  lang,
  cart,
  setCart,
  tableCode,
  cardToken,
  blocked,
  manualTable,
  onTable,
  onClose,
  onPlaced,
}: {
  slug: string;
  data: PublicMenu;
  T: Dict;
  lang: string;
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  tableCode?: string;
  cardToken?: string;
  blocked: boolean;
  manualTable: string;
  onTable: (v: string) => void;
  onClose: () => void;
  onPlaced: (token: string) => void;
}) {
  const s = data.settings!;
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState("");
  const [method, setMethod] = useState(s.paymentMethods[0] ?? "cash");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const keyRef = useRef<{ sig: string; key: string } | null>(null);

  const payload = useMemo(() => cart.map((l) => ({ itemId: l.itemId, variantId: l.variantId, qty: l.qty, instructions: l.instructions, selections: l.selections })), [cart]);

  useEffect(() => {
    if (!cart.length) {
      setQuote(null);
      return;
    }
    const h = setTimeout(async () => {
      try {
        setQuote(await api<Quote>("/api/public/quote", { body: { slug, items: payload, couponCode: applied } }));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not price your order");
      }
    }, 250);
    return () => clearTimeout(h);
  }, [payload, applied, slug, cart.length]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const place = async () => {
    setError("");
    if (!tableCode) {
      setError(T.needTable);
      return;
    }
    const sig = JSON.stringify([payload, applied, method, notes, tableCode]);
    if (!keyRef.current || keyRef.current.sig !== sig) keyRef.current = { sig, key: crypto.randomUUID() };
    setPlacing(true);
    try {
      const r = await api<{ token: string }>("/api/public/orders", { body: { slug, items: payload, couponCode: applied, tableCode, cardToken, clientKey: keyRef.current.key, notes, paymentMethod: method, language: lang } });
      if (method === "online") {
        const c = await api<{ url: string }>(`/api/public/orders/${r.token}`, { body: { action: "checkout" } });
        window.location.href = c.url;
        return;
      }
      onPlaced(r.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place order");
      setPlacing(false);
    }
  };

  const est = cart.reduce((a, l) => a + l.unitPrice * l.qty, 0);
  const tot = quote?.totals;
  const hasErr = !!quote?.errors.length;

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div role="dialog" aria-modal="true" aria-label={T.bag} initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 320 }} className="c-bg c-fg flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border c-line sm:max-w-lg sm:rounded-[2rem]">
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="font-display text-3xl">{T.bag}</h2>
          <button onClick={onClose} aria-label="Close" className="grid h-9 w-9 place-items-center rounded-full border c-line">
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-4">
          {cart.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-5xl">🛍️</p>
              <p className="font-display mt-3 text-2xl">{T.empty}</p>
              <p className="c-muted text-sm">{T.emptySub}</p>
            </div>
          ) : (
            <>
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {cart.map((l) => {
                    const ql = quote?.lines.find((x) => x.itemId === l.itemId && x.qty === l.qty);
                    return (
                      <motion.li key={l.key} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60, height: 0 }} className="flex gap-3 rounded-2xl border c-line p-3">
                        {l.image && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={l.image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-tight">{l.name}</p>
                          {l.details.length > 0 && <p className="c-muted mt-0.5 text-xs leading-snug">{l.details.join(" · ")}</p>}
                          {l.instructions && <p className="mt-0.5 text-xs italic text-amber-300/90">“{l.instructions}”</p>}
                          {ql?.errors.length ? <p className="mt-1 text-xs text-red-400">{ql.errors[0]}</p> : null}
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm">
                              <button aria-label="Less" onClick={() => setCart((c) => (l.qty <= 1 ? c.filter((x) => x.key !== l.key) : c.map((x) => (x.key === l.key ? { ...x, qty: x.qty - 1 } : x))))} className="grid h-7 w-7 place-items-center rounded-full border c-line">
                                −
                              </button>
                              <span className="w-5 text-center tabular-nums">{l.qty}</span>
                              <button aria-label="More" onClick={() => setCart((c) => c.map((x) => (x.key === l.key ? { ...x, qty: Math.min(50, x.qty + 1) } : x)))} className="grid h-7 w-7 place-items-center rounded-full border c-line">
                                +
                              </button>
                              <button onClick={() => setCart((c) => c.filter((x) => x.key !== l.key))} className="c-muted ml-2 text-xs underline">
                                {T.remove}
                              </button>
                            </div>
                            <span className="font-medium tabular-nums">{formatMoney(ql?.lineTotal ?? l.unitPrice * l.qty, s.currency)}</span>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>

              <label className="block">
                <span className="c-muted text-[11px] uppercase tracking-[0.2em]">{T.orderNotes}</span>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} rows={2} className="mt-1.5 w-full rounded-2xl border c-line bg-transparent px-4 py-3 text-sm outline-none" />
              </label>

              <div>
                <span className="c-muted text-[11px] uppercase tracking-[0.2em]">{T.coupon}</span>
                <div className="mt-1.5 flex gap-2">
                  <input value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="WELCOME10" className="min-w-0 flex-1 rounded-full border c-line bg-transparent px-4 py-2.5 text-sm uppercase outline-none" />
                  <button onClick={() => setApplied(coupon.trim())} className="rounded-full border c-line px-5 text-sm">
                    {T.apply}
                  </button>
                </div>
                {quote?.couponError && applied && <p className="mt-1.5 text-xs text-red-400">{quote.couponError}</p>}
                {quote?.couponApplied && <p className="mt-1.5 text-xs text-emerald-400">✓ {quote.couponApplied}</p>}
              </div>

              <div>
                <span className="c-muted text-[11px] uppercase tracking-[0.2em]">{T.payment}</span>
                <div className="mt-1.5 grid gap-2" role="radiogroup">
                  {s.paymentMethods.map((m) => (
                    <button key={m} role="radio" aria-checked={method === m} onClick={() => setMethod(m)} className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm ${method === m ? "c-ring border-transparent bg-white/10" : "c-line"}`}>
                      <span>{m === "cash" ? "💵" : m === "online" ? "💳" : "🧾"}</span>
                      {T[m as "cash" | "card_at_table" | "online"]}
                    </button>
                  ))}
                </div>
              </div>

              {!tableCode && (
                <label className="block">
                  <span className="c-muted text-[11px] uppercase tracking-[0.2em]">{T.needTable}</span>
                  <input value={manualTable} onChange={(e) => onTable(e.target.value)} placeholder="T04" className="mt-1.5 w-full rounded-full border c-line bg-transparent px-4 py-2.5 text-sm uppercase outline-none" />
                </label>
              )}

              <dl className="space-y-1.5 border-t c-line pt-4 text-sm">
                <Row k={T.subtotal} v={formatMoney(tot?.subtotal ?? est, s.currency)} />
                {!!tot?.discount && <Row k={T.discount} v={`− ${formatMoney(tot.discount, s.currency)}`} good />}
                {!!tot?.serviceCharge && <Row k="Service" v={formatMoney(tot.serviceCharge, s.currency)} />}
                {!!tot?.tax && <Row k={s.taxLabel} v={formatMoney(tot.tax, s.currency)} />}
                {!!tot?.fees && <Row k={s.feeLabel} v={formatMoney(tot.fees, s.currency)} />}
                <div className="flex items-baseline justify-between pt-2">
                  <dt className="font-display text-2xl">{T.total}</dt>
                  <dd className="c-brand font-display text-3xl tabular-nums">{tot ? formatMoney(tot.total, s.currency) : "…"}</dd>
                </div>
              </dl>
            </>
          )}
        </div>
        <div className="border-t c-line px-6 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {(error || (hasErr && quote?.errors[0])) && (
            <p role="alert" className="mb-2 text-sm text-red-400">
              {error || quote?.errors[0]}
            </p>
          )}
          <button onClick={place} disabled={placing || !cart.length || blocked || hasErr || !tot} className="c-brand-grad w-full rounded-full py-4 text-base font-semibold shadow-[0_14px_40px_-12px_var(--brand)] disabled:opacity-40">
            {placing ? T.placing : `${T.placeOrder}${tot ? ` · ${formatMoney(tot.total, s.currency)}` : ""}`}
          </button>
          <p className="c-muted mt-2 text-center text-[11px]">Prices are confirmed by the restaurant’s server when you order.</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
const Row = ({ k, v, good }: { k: string; v: string; good?: boolean }) => (
  <div className="flex justify-between">
    <dt className="c-muted">{k}</dt>
    <dd className={`tabular-nums ${good ? "text-emerald-400" : ""}`}>{v}</dd>
  </div>
);
