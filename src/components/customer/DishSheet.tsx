"use client";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "framer-motion";
import { createElement, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MenuItemFull } from "@/lib/orders";
import { formatMoney, optionPrice, resolveItem, tr, trDesc, type Selection } from "@/lib/pricing";
import type { Dict } from "@/lib/i18n";
import type { Food3DApi, ViewName } from "./Food3D";

const Food3D = dynamic(() => import("./Food3D"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center">
      <div className="h-24 w-24 animate-pulse rounded-full bg-gradient-to-br from-amber-500/30 to-orange-700/10 blur-sm" />
    </div>
  ),
});

export type CartLine = {
  key: string;
  itemId: string;
  variantId: string | null;
  selections: Selection[];
  qty: number;
  instructions: string;
  name: string;
  variantName: string | null;
  unitPrice: number;
  details: string[];
  image: string | null;
};

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const SIZE_SCALE: Record<string, number> = { small: 0.82, medium: 1, large: 1.08, regular: 1 };

export function webglOK() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function DishSheet({ item, lang, currency, T, lite, onClose, onAdd }: { item: MenuItemFull; lang: string; currency: string; T: Dict; lite: boolean; onClose: () => void; onAdd: (l: CartLine) => void }) {
  const has3d = item.visual !== "generic" || !!item.modelUrl;
  const [gl, setGl] = useState(false);
  const [mode, setMode] = useState<"photo" | "3d">("photo");
  const [cam, setCam] = useState<ViewName>("angle");
  const [variantId, setVariantId] = useState<string | null>(() => (item.variants.find((v) => v.isDefault && v.available) ?? item.variants.find((v) => v.available) ?? null)?.id ?? null);
  const [sel, setSel] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    for (const g of item.groups) for (const op of g.options) if (op.isDefault && op.available) o[op.id] = 1;
    return o;
  });
  const [qty, setQty] = useState(1);
  const [instr, setInstr] = useState("");
  const [shake, setShake] = useState<string | null>(null);
  const api3d = useRef<Food3DApi | null>(null);

  useEffect(() => {
    const ok = webglOK();
    setGl(ok);
    if (ok && has3d && !lite) setMode("3d");
  }, [has3d, lite]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const selections: Selection[] = useMemo(() => Object.entries(sel).filter(([, q]) => q > 0).map(([optionId, q]) => ({ optionId, qty: q })), [sel]);
  const r = useMemo(() => resolveItem(item, variantId, selections), [item, variantId, selections]);
  const activeGroups = item.groups.filter((g) => r.activeGroupIds.includes(g.id));

  // newly-activated required groups get their default option pre-selected
  useEffect(() => {
    setSel((cur) => {
      let next = cur;
      for (const g of activeGroups) {
        if (g.minSelect >= 1 && !g.options.some((o) => (cur[o.id] ?? 0) > 0)) {
          const d = g.options.find((o) => o.isDefault && o.available);
          if (d) next = { ...next, [d.id]: 1 };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r.activeGroupIds.join(",")]);

  const layers = useMemo(() => {
    const out: string[] = [];
    for (const l of r.lines) {
      out.push(`${l.action}:${slug(l.optionName)}`);
      const opt = item.groups.flatMap((g) => g.options).find((o) => o.id === l.optionId);
      if (opt?.layer) out.push("layer:" + opt.layer);
      if (/cheese burst/i.test(l.optionName)) out.push("crust:cheeseburst");
      if (/thin/i.test(l.optionName) && /crust/i.test(l.groupName)) out.push("crust:thin");
    }
    if (r.variant) out.push("choice:" + slug(r.variant.name));
    return out;
  }, [r, item.groups]);

  const scale = r.variant ? (SIZE_SCALE[r.variant.name.toLowerCase()] ?? 1) : 1;

  const toggle = (gid: string, oid: string) => {
    const g = item.groups.find((x) => x.id === gid)!;
    setSel((cur) => {
      const next = { ...cur };
      const picked = (cur[oid] ?? 0) > 0;
      if (g.maxSelect === 1 && !g.allowQuantity) {
        for (const o of g.options) delete next[o.id];
        if (!(picked && g.minSelect === 0)) next[oid] = 1;
        return next;
      }
      if (picked) {
        delete next[oid];
        return next;
      }
      const total = g.options.reduce((a, o) => a + (cur[o.id] ?? 0), 0);
      if (g.maxSelect > 0 && total >= g.maxSelect) {
        setShake(gid);
        setTimeout(() => setShake(null), 400);
        return cur;
      }
      next[oid] = 1;
      return next;
    });
  };
  const step = (gid: string, oid: string, d: number) => {
    const g = item.groups.find((x) => x.id === gid)!;
    setSel((cur) => {
      const q = (cur[oid] ?? 0) + d;
      const total = g.options.reduce((a, o) => a + (cur[o.id] ?? 0), 0);
      if (d > 0 && ((g.maxSelect > 0 && total >= g.maxSelect) || q > g.maxQty)) {
        setShake(gid);
        setTimeout(() => setShake(null), 400);
        return cur;
      }
      const next = { ...cur };
      if (q <= 0) delete next[oid];
      else next[oid] = q;
      return next;
    });
  };

  const add = () => {
    if (!r.ok || !item.availableNow) return;
    const details = [...(r.variant ? [r.variant.name] : []), ...r.lines.map((l) => (l.action === "remove" ? `No ${l.optionName}` : l.action === "add" ? `+ ${l.optionName}${l.qty > 1 ? ` ×${l.qty}` : ""}` : l.optionName))];
    const clean = r.lines.map((l) => ({ optionId: l.optionId, qty: l.qty }));
    onAdd({
      key: JSON.stringify([item.id, variantId, clean, instr.trim()]),
      itemId: item.id,
      variantId,
      selections: clean,
      qty,
      instructions: instr.trim(),
      name: tr(item, lang),
      variantName: r.variant?.name ?? null,
      unitPrice: r.unitPrice,
      details,
      image: item.imageUrl,
    });
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={tr(item, lang)}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className="c-bg c-fg relative flex max-h-[96dvh] w-full flex-col overflow-hidden rounded-t-[2rem] border c-line sm:max-w-xl sm:rounded-[2rem]"
      >
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur hover:bg-black/70">
          ✕
        </button>

        <div className="relative h-[38vh] min-h-[250px] shrink-0 overflow-hidden bg-gradient-to-b from-neutral-900 to-black">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_80%_at_50%_0%,rgba(251,146,60,.28),transparent)]" />
          {mode === "3d" && gl ? (
            <div className="absolute inset-0">
              <Food3D visual={item.visual} layers={layers} scale={scale} view={cam} modelUrl={item.modelUrl} lite={lite} onReady={(a) => (api3d.current = a)} />
            </div>
          ) : item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={tr(item, lang)} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-6xl">🍽️</div>
          )}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--bg)] to-transparent" />
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full glass p-1 text-xs">
            <button onClick={() => setMode("photo")} className={`rounded-full px-3 py-1.5 ${mode === "photo" ? "c-brand-bg" : "text-white/80"}`}>
              {T.photo}
            </button>
            <button
              onClick={() => gl && has3d && setMode("3d")}
              disabled={!gl || !has3d}
              title={!gl ? "WebGL not available on this device" : !has3d ? "No 3D model for this dish" : ""}
              className={`rounded-full px-3 py-1.5 disabled:opacity-40 ${mode === "3d" ? "c-brand-bg" : "text-white/80"}`}
            >
              {T.view3d}
            </button>
            {mode === "3d" && (
              <>
                <span className="mx-1 h-4 w-px bg-white/20" />
                {(["angle", "top", "side"] as ViewName[]).map((v) => (
                  <button key={v} onClick={() => setCam(v)} aria-pressed={cam === v} className={`rounded-full px-2.5 py-1.5 capitalize ${cam === v ? "bg-white/20 text-white" : "text-white/60"}`}>
                    {v}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-4 pt-1">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-3xl leading-tight">{tr(item, lang)}</h2>
            <p className="c-brand font-display text-2xl">{formatMoney(item.basePrice + (r.variant?.priceDelta ?? 0), currency)}</p>
          </div>
          <p className="c-muted mt-1 text-sm leading-relaxed">{trDesc(item, lang)}</p>

          {item.ingredients.length > 0 && (
            <div className="mt-4">
              <p className="c-muted mb-2 text-[11px] uppercase tracking-[0.2em]">{T.ingredients}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.ingredients.map((ing, i) => {
                  const removed = r.lines.some((l) => l.action === "remove" && l.optionName.toLowerCase() === ing.toLowerCase());
                  return (
                    <motion.span key={ing} initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: lite ? 0 : 0.12 + i * 0.05 }} className={`rounded-full border c-line px-3 py-1 text-xs ${removed ? "line-through opacity-40" : ""}`}>
                      {ing}
                    </motion.span>
                  );
                })}
              </div>
            </div>
          )}

          {mode === "3d" && gl && <ARLauncher item={item} api={api3d} />}

          {item.variants.length > 0 && (
            <section className="mt-6" aria-label={T.size}>
              <GroupTitle title={T.size} badge={T.required} brand />
              <div className="grid grid-cols-3 gap-2" role="radiogroup">
                {item.variants.map((v) => (
                  <button
                    key={v.id}
                    role="radio"
                    aria-checked={variantId === v.id}
                    disabled={!v.available}
                    onClick={() => setVariantId(v.id)}
                    className={`rounded-2xl border px-3 py-3 text-center transition disabled:opacity-30 ${variantId === v.id ? "c-ring border-transparent bg-white/10" : "c-line hover:bg-white/5"}`}
                  >
                    <p className="text-sm font-medium">{v.name}</p>
                    <p className="c-muted text-xs">{v.priceDelta === 0 ? formatMoney(item.basePrice, currency) : formatMoney(item.basePrice + v.priceDelta, currency)}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          <AnimatePresence initial={false}>
            {activeGroups.map((g) => {
              const total = g.options.reduce((a, o) => a + (sel[o.id] ?? 0), 0);
              const single = g.maxSelect === 1 && !g.allowQuantity;
              const gname = g.translations?.[lang]?.name || g.name;
              return (
                <motion.section key={g.id} layout initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto", x: shake === g.id ? [0, -6, 6, -4, 0] : 0 }} exit={{ opacity: 0, height: 0 }} className="mt-6 overflow-hidden" aria-label={gname}>
                  <GroupTitle title={g.kind === "remove" ? `${gname}` : gname} badge={g.minSelect > 0 ? T.required : T.optional} brand={g.minSelect > 0} sub={!single && g.maxSelect > 0 ? `${T.chooseUpTo} ${g.maxSelect} · ${total}/${g.maxSelect}` : undefined} />
                  <div className="space-y-1.5">
                    {g.options.map((o) => {
                      const q = sel[o.id] ?? 0;
                      const on = q > 0;
                      const price = optionPrice(o, r.variant?.name ?? null);
                      return (
                        <div key={o.id} className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 transition ${on ? "border-transparent bg-white/10 c-ring" : "c-line"} ${!o.available ? "opacity-40" : ""}`}>
                          <button
                            type="button"
                            role={single ? "radio" : "checkbox"}
                            aria-checked={on}
                            disabled={!o.available}
                            onClick={() => toggle(g.id, o.id)}
                            className="flex flex-1 items-center gap-3 text-left"
                          >
                            <span className={`grid h-5 w-5 shrink-0 place-items-center border text-[10px] ${single ? "rounded-full" : "rounded-md"} ${on ? (g.kind === "remove" ? "border-red-400 bg-red-500 text-white" : "c-brand-bg border-transparent") : "c-line"}`}>{on ? (g.kind === "remove" ? "✕" : "✓") : ""}</span>
                            <span className={`text-sm ${g.kind === "remove" && on ? "line-through opacity-70" : ""}`}>
                              {g.kind === "remove" ? `${T.remove}: ` : ""}
                              {o.translations?.[lang]?.name || o.name}
                              {!o.available && <span className="c-muted ml-2 text-xs">· {T.soldOut}</span>}
                            </span>
                          </button>
                          {g.allowQuantity && on && (
                            <div className="flex items-center gap-2 text-sm">
                              <button aria-label="Less" onClick={() => step(g.id, o.id, -1)} className="grid h-7 w-7 place-items-center rounded-full border c-line">
                                −
                              </button>
                              <span className="w-4 text-center tabular-nums">{q}</span>
                              <button aria-label="More" onClick={() => step(g.id, o.id, 1)} className="grid h-7 w-7 place-items-center rounded-full border c-line">
                                +
                              </button>
                            </div>
                          )}
                          {price !== 0 && <span className="c-muted w-16 text-right text-xs tabular-nums">{price > 0 ? "+" : "−"}{formatMoney(Math.abs(price), currency)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </motion.section>
              );
            })}
          </AnimatePresence>

          <section className="mt-6">
            <GroupTitle title={T.instructions} badge={T.optional} />
            <textarea value={instr} onChange={(e) => setInstr(e.target.value.slice(0, 300))} placeholder={T.instructionsPh} rows={2} className="w-full rounded-2xl border c-line bg-transparent px-4 py-3 text-sm outline-none focus:c-ring" />
          </section>
        </div>

        <div className="border-t c-line c-bg px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          {!r.ok && <p className="mb-2 text-xs text-amber-300" role="status">{r.errors[0]}</p>}
          {!item.availableNow && <p className="mb-2 text-xs text-red-300">{T.soldOut}</p>}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border c-line p-1" role="group" aria-label={T.quantity}>
              <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
                −
              </button>
              <motion.span key={qty} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="w-6 text-center font-medium tabular-nums">
                {qty}
              </motion.span>
              <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(20, q + 1))} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/10">
                +
              </button>
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={add} disabled={!r.ok || !item.availableNow} className="c-brand-grad flex-1 rounded-full py-3.5 text-[15px] font-semibold shadow-[0_10px_30px_-10px_var(--brand)] disabled:opacity-40">
              {T.add} ·{" "}
              <motion.span key={r.unitPrice * qty} initial={{ opacity: 0.4, y: -4 }} animate={{ opacity: 1, y: 0 }} className="inline-block tabular-nums">
                {formatMoney(r.unitPrice * qty, currency)}
              </motion.span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function GroupTitle({ title, badge, sub, brand }: { title: string; badge: string; sub?: string; brand?: boolean }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-2">
      <h3 className="font-display text-xl">
        {title}
        {sub && <span className="c-muted ml-2 font-sans text-xs font-normal">{sub}</span>}
      </h3>
      <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${brand ? "c-brand-bg" : "c-muted border c-line"}`}>{badge}</span>
    </div>
  );
}

/* ───────── AR (real WebXR / Scene Viewer / Quick Look via <model-viewer>) ───────── */
const MV_SRC = "https://ajax.googleapis.com/ajax/libs/model-viewer/4.0.0/model-viewer.min.js";

function ARLauncher({ item, api }: { item: MenuItemFull; api: React.MutableRefObject<Food3DApi | null> }) {
  const [open, setOpen] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "unsupported" | "error">("idle");
  const el = useRef<HTMLElement | null>(null);

  const prepare = useCallback(async () => {
    setOpen(true);
    setState("loading");
    try {
      if (!customElements.get("model-viewer")) {
        await new Promise<void>((res, rej) => {
          const s = document.createElement("script");
          s.type = "module";
          s.src = MV_SRC;
          s.onload = () => res();
          s.onerror = () => rej(new Error("AR component failed to load (offline?)"));
          document.head.appendChild(s);
        });
        await customElements.whenDefined("model-viewer");
      }
      let url: string;
      if (item.modelUrl) url = new URL(item.modelUrl, location.href).href;
      else {
        if (!api.current) throw new Error("3D model not ready yet");
        url = URL.createObjectURL(await api.current.exportGLB());
      }
      setSrc(url);
    } catch {
      setState("error");
    }
  }, [item.modelUrl, api]);

  useEffect(() => {
    if (!src) return;
    const node = el.current as (HTMLElement & { canActivateAR?: boolean }) | null;
    if (!node) return;
    const onLoad = () => setState(node.canActivateAR ? "ready" : "unsupported");
    node.addEventListener("load", onLoad);
    node.addEventListener("error", () => setState("error"));
    return () => node.removeEventListener("load", onLoad);
  }, [src]);

  return (
    <div className="mt-4 rounded-2xl border c-line p-3 text-sm">
      {!open ? (
        <button onClick={prepare} className="flex w-full items-center justify-between">
          <span>
            <span className="font-medium">View on your table (AR)</span>
            <span className="c-muted block text-xs">Uses your phone’s real AR — WebXR, Android Scene Viewer or iOS Quick Look.</span>
          </span>
          <span className="c-brand-bg rounded-full px-3 py-1.5 text-xs font-semibold">{T_AR}</span>
        </button>
      ) : (
        <div>
          {state === "loading" && <p className="c-muted">Preparing the 3D model for AR…</p>}
          {state === "ready" && (
            <div className="flex items-center justify-between gap-3">
              <p className="c-muted text-xs">Point your camera at the table, then tap to place the dish at real size.</p>
              <button className="c-brand-grad rounded-full px-4 py-2 text-xs font-semibold" onClick={() => (el.current as unknown as { activateAR: () => void }).activateAR()}>
                Launch AR
              </button>
            </div>
          )}
          {state === "unsupported" && <p className="c-muted text-xs">AR isn’t supported on this device or browser (it needs ARCore on Android Chrome, or an AR Quick Look-capable iPhone/iPad). The interactive 3D viewer above works everywhere.</p>}
          {state === "error" && <p className="text-xs text-red-300">Couldn’t start AR here. You can still rotate and zoom the dish in 3D.</p>}
          {src && createElement("model-viewer", { ref: el, src, ar: true, "ar-modes": "webxr scene-viewer quick-look", "ar-scale": "auto", "camera-controls": true, style: { position: "absolute", width: 2, height: 2, opacity: 0, pointerEvents: "none" }, alt: item.name })}
        </div>
      )}
    </div>
  );
}
const T_AR = "AR";
