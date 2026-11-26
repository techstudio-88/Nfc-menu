/* Shared (client + server) customization & pricing engine. Pure functions, no I/O.
   The server re-runs this on every order; client results are only for display. */

export type OptionDTO = {
  id: string;
  name: string;
  price: number;
  priceBySize: Record<string, number>;
  available: boolean;
  isDefault: boolean;
  layer: string | null;
  translations?: Record<string, { name?: string }>;
};

export type GroupDTO = {
  id: string;
  name: string;
  kind: "choice" | "add" | "remove";
  minSelect: number;
  maxSelect: number;
  allowQuantity: boolean;
  maxQty: number;
  rule: { variantNames?: string[]; whenOptionIds?: string[] } | null;
  translations?: Record<string, { name?: string }>;
  options: OptionDTO[];
};

export type VariantDTO = { id: string; name: string; priceDelta: number; isDefault: boolean; available: boolean };

export type PricedItem = { basePrice: number; variants: VariantDTO[]; groups: GroupDTO[] };
export type Selection = { optionId: string; qty: number };

export type ResolvedLine = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  action: "choice" | "add" | "remove";
  qty: number;
  priceDelta: number; // total for this line (unit option price × qty)
};

export type Resolved = {
  ok: boolean;
  errors: string[];
  unitPrice: number;
  variant: VariantDTO | null;
  lines: ResolvedLine[];
  activeGroupIds: string[];
};

/** priceBySize is keyed by lower-cased size (variant) name so option groups can be shared across dishes. */
export function optionPrice(o: OptionDTO, variantName: string | null) {
  const k = variantName?.trim().toLowerCase();
  if (k && typeof o.priceBySize?.[k] === "number") return o.priceBySize[k];
  return o.price;
}

export function resolveItem(item: PricedItem, variantId: string | null, selections: Selection[]): Resolved {
  const errors: string[] = [];
  let variant: VariantDTO | null = null;
  if (item.variants.length > 0) {
    variant = item.variants.find((v) => v.id === variantId) ?? null;
    if (!variant) errors.push("Please choose a size.");
    else if (!variant.available) errors.push(`${variant.name} is not available.`);
  }
  const selMap = new Map<string, number>();
  for (const s of selections) {
    const q = Math.floor(Number(s.qty));
    if (!s.optionId || !Number.isFinite(q) || q < 1) continue;
    selMap.set(s.optionId, (selMap.get(s.optionId) ?? 0) + q);
  }
  const lines: ResolvedLine[] = [];
  const selectedIds = new Set<string>();
  const activeGroupIds: string[] = [];
  let extras = 0;

  for (const g of item.groups) {
    const r = g.rule;
    const byVariant = !r?.variantNames?.length || (variant ? r.variantNames.map((n) => n.toLowerCase()).includes(variant.name.toLowerCase()) : false);
    const byOption = !r?.whenOptionIds?.length || r.whenOptionIds.some((id) => selectedIds.has(id));
    if (!(byVariant && byOption)) continue;
    activeGroupIds.push(g.id);
    let total = 0;
    for (const o of g.options) {
      let q = selMap.get(o.id);
      if (!q) continue;
      if (!o.available) {
        errors.push(`${o.name} is currently unavailable.`);
        continue;
      }
      const maxq = g.allowQuantity ? Math.max(1, g.maxQty) : 1;
      if (q > maxq) {
        errors.push(`${o.name}: maximum ${maxq}.`);
        q = maxq;
      }
      const unit = optionPrice(o, variant?.name ?? null);
      const delta = unit * q;
      extras += delta;
      total += q;
      selectedIds.add(o.id);
      lines.push({ groupId: g.id, groupName: g.name, optionId: o.id, optionName: o.name, action: g.kind, qty: q, priceDelta: delta });
    }
    if (total < g.minSelect) errors.push(g.minSelect === 1 ? `Please choose: ${g.name}.` : `${g.name}: choose at least ${g.minSelect}.`);
    if (g.maxSelect > 0 && total > g.maxSelect) errors.push(`${g.name}: choose at most ${g.maxSelect}.`);
  }
  const unitPrice = item.basePrice + (variant?.priceDelta ?? 0) + extras;
  return { ok: errors.length === 0, errors, unitPrice, variant, lines, activeGroupIds };
}

/* ───────── totals ───────── */

export type TotalsSettings = { taxRateBps: number; serviceChargeBps: number; feeCents: number; autoDiscountBps: number };
export type CouponLite = { kind: string; value: number; minSubtotal: number } | null;

export function computeTotals(subtotal: number, s: TotalsSettings, coupon: CouponLite) {
  let discount = Math.round((subtotal * s.autoDiscountBps) / 10000);
  if (coupon && subtotal >= coupon.minSubtotal) {
    discount += coupon.kind === "percent" ? Math.round((subtotal * coupon.value) / 10000) : coupon.value;
  }
  discount = Math.min(discount, subtotal);
  const taxable = subtotal - discount;
  const tax = Math.round((taxable * s.taxRateBps) / 10000);
  const serviceCharge = Math.round((taxable * s.serviceChargeBps) / 10000);
  const fees = subtotal > 0 ? s.feeCents : 0;
  return { subtotal, discount, tax, serviceCharge, fees, total: taxable + tax + serviceCharge + fees };
}

/* ───────── helpers ───────── */

export function formatMoney(cents: number, currency = "USD", locale?: string) {
  try {
    return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function nowHHMM(tz: string) {
  try {
    const s = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz }).format(new Date());
    return s.replace("24:", "00:");
  } catch {
    return new Date().toISOString().slice(11, 16);
  }
}

export function withinSchedule(from: string | null, to: string | null, now: string) {
  if (!from || !to) return true;
  return from <= to ? now >= from && now <= to : now >= from || now <= to;
}

export function tr<T extends { name: string; translations?: Record<string, { name?: string; description?: string }> }>(e: T, lang: string) {
  return e.translations?.[lang]?.name?.trim() || e.name;
}
export function trDesc<T extends { description: string; translations?: Record<string, { name?: string; description?: string }> }>(e: T, lang: string) {
  return e.translations?.[lang]?.description?.trim() || e.description;
}

export const STATUS_FLOW = ["placed", "accepted", "preparing", "ready", "served", "completed"] as const;
export type OrderStatus = (typeof STATUS_FLOW)[number] | "cancelled";
