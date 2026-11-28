import type { CSSProperties } from "react";

/** Owner-selectable colour presets. The first one is the TapMenu default (premium red). */
export const PRESETS = [
  { id: "premium-red", name: "Premium Red", primary: "#8e1b2a", accent: "#c2303f" },
  { id: "royal-emerald", name: "Royal Emerald", primary: "#087653", accent: "#0b8c64" },
  { id: "saffron", name: "Saffron", primary: "#b45309", accent: "#d97706" },
  { id: "midnight-blue", name: "Midnight Blue", primary: "#1e3a8a", accent: "#3b5bdb" },
  { id: "royal-purple", name: "Royal Purple", primary: "#5b21b6", accent: "#7c3aed" },
  { id: "charcoal-gold", name: "Charcoal & Gold", primary: "#262626", accent: "#b8891b" },
] as const;

export const DEFAULT_PRIMARY = PRESETS[0].primary;
export const DEFAULT_ACCENT = PRESETS[0].accent;
/** The old schema default (amber) means "never customised" — show the premium default instead. */
const LEGACY_UNSET = new Set(["#f59e0b", "#c93449"]);

const HEX = /^#[0-9a-f]{6}$/i;
const clean = (v: string | null | undefined, fb: string) => (v && HEX.test(v) && !LEGACY_UNSET.has(v.toLowerCase()) ? v : fb);

const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const hex = (c: number[]) => "#" + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("");
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [rgb(a), rgb(b)];
  return hex(x.map((v, i) => v + (y[i] - v) * t));
};

export function themeColors(primary?: string | null, accent?: string | null) {
  const p = clean(primary, DEFAULT_PRIMARY);
  const a = clean(accent, mix(p, "#ffffff", 0.18));
  return { primary: p, accent: a };
}

/** CSS custom properties consumed by globals.css (--tm-*). Set them on any wrapper element. */
export function themeStyle(primary?: string | null, accent?: string | null): CSSProperties {
  const { primary: p, accent: a } = themeColors(primary, accent);
  return {
    "--tm-brand": p,
    "--tm-bright": a,
    "--tm-deep": mix(p, "#000000", 0.38),
    "--tm-night": mix(p, "#000000", 0.8),
    "--tm-soft": mix(p, "#ffffff", 0.92),
    "--tm-t1": mix(p, "#000000", 0.45),
    "--tm-t2": mix(p, "#000000", 0.25),
    "--tm-d2": mix(p, "#000000", 0.3),
    "--tm-d3": mix(p, "#000000", 0.5),
    "--tm-d4": mix(p, "#000000", 0.65),
    "--tm-tint": mix(p, "#ffffff", 0.7),
  } as CSSProperties;
}

/** Guest-menu themes. `noir` was the old schema default, so it maps to the new light premium look. */
export const MENU_THEMES = [
  { id: "porcelain", name: "Porcelain", bg: "#faf6f1" },
  { id: "ivory", name: "Ivory", bg: "#faf6ee" },
  { id: "midnight", name: "Midnight", bg: "#0b0b0b" },
  { id: "ember", name: "Ember", bg: "#120a06" },
] as const;
export const normalizeTheme = (t?: string | null) => (!t || t === "noir" ? "porcelain" : t);
