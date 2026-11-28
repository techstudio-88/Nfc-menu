"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import { Button, Loading, useAsync, useToast, cx } from "@/components/ui";

type Variant = { id: string; name: string; priceDelta: number; isDefault: boolean; available: boolean };
type Item = { id: string; categoryId: string; name: string; basePrice: number; imageUrl: string | null; available: boolean; availableNow: boolean; variants: Variant[]; groups: { minSelect: number }[] };
type Menu = { settings?: { currency: string }; menu?: { categories: { id: string; name: string }[]; items: Item[] } };
type Line = { key: string; itemId: string; name: string; variantId: string | null; variantName: string; unit: number; qty: number };
type Totals = { subtotal: number; discount: number; tax: number; serviceCharge: number; fees: number; total: number };

const MODES = [["dine", "Dine-in"], ["TAKEAWAY", "Takeaway"], ["DELIVERY", "Delivery"]] as const;

export default function PosApp({ slug, tableCodes }: { slug: string; tableCodes: string[] }) {
  const toast = useToast();
  const m = useAsync<Menu>(() => api<Menu>(`/api/public/menu/${slug}`), [slug]);
  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [mode, setMode] = useState<(typeof MODES)[number][0]>("dine");
  const [table, setTable] = useState(tableCodes[0] ?? "");
  const [notes, setNotes] = useState("");
  const [coupon, setCoupon] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [busy, setBusy] = useState(false);
  const [pick, setPick] = useState<Item | null>(null);
  const cur = m.data?.settings?.currency ?? "INR";
  const money = (c: number) => formatMoney(c, cur);

  const items = useMemo(() => (m.data?.menu?.items ?? []).filter((i) => i.available && i.availableNow && !i.groups.some((g) => g.minSelect > 0)), [m.data]);
  const shown = items.filter((i) => (cat === "all" || i.categoryId === cat) && i.name.toLowerCase().includes(q.toLowerCase()));

  const requote = async (next: Line[], code = coupon) => {
    if (!next.length) return setTotals(null);
    try {
      const r = await api<{ totals: Totals }>("/api/public/quote", { body: { slug, items: next.map((l) => ({ itemId: l.itemId, variantId: l.variantId, qty: l.qty })), couponCode: code || null } });
      setTotals(r.totals);
    } catch { setTotals(null); }
  };
  const set = (next: Line[]) => { setLines(next); void requote(next); };
  const add = (it: Item, v?: Variant) => {
    const variant = v ?? it.variants.find((x) => x.isDefault && x.available) ?? null;
    const key = it.id + (variant?.id ?? "");
    const hit = lines.find((l) => l.key === key);
    set(hit ? lines.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...lines, { key, itemId: it.id, name: it.name, variantId: variant?.id ?? null, variantName: variant?.name ?? "", unit: it.basePrice + (variant?.priceDelta ?? 0), qty: 1 }]);
    setPick(null);
  };
  const click = (it: Item) => (it.variants.filter((v) => v.available).length > 1 ? setPick(it) : add(it));
  const bump = (key: string, d: number) => set(lines.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));

  const submit = async (collect: boolean) => {
    if (!lines.length) return;
    const tableCode = mode === "dine" ? table : mode;
    if (!tableCode) return toast("Choose a table first.", "err");
    setBusy(true);
    try {
      const r = await api<{ orderNo: number }>("/api/pos", { body: { items: lines.map((l) => ({ itemId: l.itemId, variantId: l.variantId, qty: l.qty })), tableCode, notes, couponCode: coupon || null, collect } });
      toast(`Order #${r.orderNo} ${collect ? "paid & sent to kitchen" : "sent to kitchen"}`, "ok");
      setLines([]); setTotals(null); setNotes(""); setCoupon("");
    } catch (e) { toast(e instanceof Error ? e.message : "Could not place order.", "err"); }
    finally { setBusy(false); }
  };

  if (m.loading) return <Loading />;
  const cats = m.data?.menu?.categories ?? [];
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="min-w-0">
        <div className="flex flex-wrap items-center gap-3">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dish…" aria-label="Search dish" className="min-w-0 flex-1 rounded-2xl border border-line bg-surface px-4 py-3 text-sm text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15" />
        </div>
        <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
          {[{ id: "all", name: "All" }, ...cats].map((c) => (
            <button key={c.id} onClick={() => setCat(c.id)} aria-pressed={cat === c.id} className={cx("shrink-0 rounded-2xl border px-4 py-2.5 text-sm font-medium transition", cat === c.id ? "border-brand bg-brand text-[#ffffff] shadow-[0_10px_24px_-12px_var(--tm-brand,#8e1b2a)]" : "border-line bg-surface text-mute hover:border-brand/40 hover:text-ink")}>{c.name}</button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 2xl:grid-cols-4">
          {shown.map((it) => (
            <button key={it.id} onClick={() => click(it)} className="tm-card group overflow-hidden rounded-2xl border border-line text-left transition hover:-translate-y-1">
              <div className="aspect-[4/3] bg-brand-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.imageUrl ? <img src={it.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="grid h-full place-items-center text-3xl">🍽</div>}
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-semibold text-ink">{it.name}</p>
                <div className="mt-2 flex items-center justify-between"><span className="text-sm text-brand">{money(it.basePrice)}</span><span className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-[#ffffff]">+ Add</span></div>
              </div>
            </button>
          ))}
          {!shown.length && <p className="col-span-full rounded-2xl border border-dashed border-line p-10 text-center text-sm text-mute">No dishes found. Items with required options are ordered from the guest menu.</p>}
        </div>
      </section>

      <aside className="tm-card h-fit rounded-3xl border border-line p-5 xl:sticky xl:top-6">
        <div className="flex items-center justify-between"><h2 className="font-display text-2xl text-ink">Current order</h2><span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-deep">{lines.reduce((a, l) => a + l.qty, 0)} items</span></div>
        <div className="mt-4 grid grid-cols-3 gap-1 rounded-2xl bg-porcelain p-1">
          {MODES.map(([k, n]) => <button key={k} onClick={() => setMode(k)} className={cx("rounded-xl px-2 py-2 text-xs font-semibold transition", mode === k ? "bg-brand text-[#ffffff] shadow" : "text-mute hover:text-ink")}>{n}</button>)}
        </div>
        {mode === "dine" && (
          <select value={table} onChange={(e) => setTable(e.target.value)} aria-label="Table" className="mt-3 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink">
            {tableCodes.length ? tableCodes.map((c) => <option key={c} value={c}>Table {c}</option>) : <option value="">No tables yet</option>}
          </select>
        )}
        <ul className="mt-4 max-h-[34vh] space-y-2 overflow-y-auto pr-1">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3" style={{ animation: "tm-rise .3s ease backwards" }}>
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-ink">{l.name}</p><p className="text-xs text-mute">{l.variantName && l.variantName + " · "}{money(l.unit)}</p></div>
              <div className="flex items-center gap-2"><button aria-label="Less" onClick={() => bump(l.key, -1)} className="h-7 w-7 rounded-full border border-line text-ink">−</button><span className="w-5 text-center text-sm">{l.qty}</span><button aria-label="More" onClick={() => bump(l.key, 1)} className="h-7 w-7 rounded-full bg-brand text-[#ffffff]">+</button></div>
            </li>
          ))}
          {!lines.length && <li className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-mute">Tap dishes to start an order</li>}
        </ul>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a note…" aria-label="Order note" className="mt-3 w-full rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none" />
        <div className="mt-2 flex gap-2"><input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Coupon code" aria-label="Coupon" className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink focus:border-brand focus:outline-none" /><Button variant="subtle" onClick={() => requote(lines, coupon)}>Apply</Button></div>
        <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
          {([["Subtotal", totals?.subtotal], ["Discount", totals ? -totals.discount : undefined], ["Service charge", totals?.serviceCharge], ["Tax", totals?.tax], ["Fees", totals?.fees]] as [string, number | undefined][]).filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between text-mute"><dt>{k}</dt><dd className={v! < 0 ? "text-signal" : ""}>{money(v!)}</dd></div>)}
          <div className="flex justify-between pt-2 font-display text-2xl text-ink"><dt>Total</dt><dd>{money(totals?.total ?? 0)}</dd></div>
        </dl>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button variant="subtle" disabled={!lines.length} busy={busy} onClick={() => submit(false)}>Send to kitchen</Button>
          <Button variant="primary" disabled={!lines.length} busy={busy} onClick={() => submit(true)}>Collect payment</Button>
        </div>
      </aside>

      {pick && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-brand-night/60 p-4 backdrop-blur-sm" onClick={() => setPick(null)}>
          <div role="dialog" aria-label="Choose size" className="w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-ink" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl">{pick.name}</h3>
            <div className="mt-4 grid gap-2">{pick.variants.filter((v) => v.available).map((v) => <button key={v.id} onClick={() => add(pick, v)} className="flex justify-between rounded-xl border border-line px-4 py-3 text-sm transition hover:border-brand hover:bg-brand-soft"><span>{v.name}</span><span className="text-brand">{money(pick.basePrice + v.priceDelta)}</span></button>)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
