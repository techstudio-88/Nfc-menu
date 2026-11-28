"use client";
import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");

/* ───────── toast ───────── */
type Toast = { id: number; msg: string; kind: "ok" | "err" | "info" };
const ToastCtx = createContext<(msg: string, kind?: Toast["kind"]) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Providers({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((msg: string, kind: Toast["kind"] = "ok") => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-3), { id, msg, kind }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), kind === "err" ? 6000 : 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }}
              className={cx(
                "pointer-events-auto max-w-md rounded-xl border border-l-4 bg-surface px-4 py-2.5 text-sm text-ink shadow-[0_18px_50px_-18px_rgba(6,75,55,.45)]",
                t.kind === "ok" && "border-line border-l-brand",
                t.kind === "err" && "border-signal/25 border-l-signal bg-signal-soft text-signal-deep",
                t.kind === "info" && "border-line border-l-brand-bright",
              )}
              role={t.kind === "err" ? "alert" : "status"}
            >
              {t.msg}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ───────── primitives ───────── */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" | "subtle" | "success"; size?: "sm" | "md" | "lg"; busy?: boolean };
export function Button({ variant = "subtle", size = "md", busy, className, children, disabled, ...p }: BtnProps) {
  return (
    <button
      {...p}
      disabled={disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-bright",
        size === "sm" && "px-3 py-1.5 text-xs",
        size === "md" && "px-4 py-2 text-sm",
        size === "lg" && "px-6 py-3.5 text-base",
        variant === "primary" && "bg-gradient-to-b from-brand-bright to-brand text-[#ffffff] shadow-[0_8px_22px_-8px_rgba(8,118,83,.65)] hover:brightness-110",
        variant === "success" && "bg-ok text-[#ffffff] hover:brightness-110",
        variant === "subtle" && "border border-line bg-surface text-ink shadow-sm hover:border-brand/30 hover:bg-brand-soft",
        variant === "ghost" && "text-mute hover:bg-brand-soft hover:text-ink",
        variant === "danger" && "border border-signal/30 bg-signal-soft text-signal hover:bg-signal hover:text-[#ffffff]",
        className,
      )}
    >
      {busy && <Spinner className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <span className={cx("inline-block animate-spin rounded-full border-2 border-current border-t-transparent", className ?? "h-5 w-5")} aria-hidden />;
}

const inputCls = "w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm text-ink transition placeholder:text-mute/60 focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/15 disabled:bg-porcelain disabled:text-mute";
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wider text-mute">{label}</span>
      {children}
      {hint && <span className="block text-xs text-mute">{hint}</span>}
    </label>
  );
}
export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => <input {...p} className={cx(inputCls, p.className)} />;
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea {...p} className={cx(inputCls, "min-h-20", p.className)} />;
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => <select {...p} className={cx(inputCls, p.className)} />;

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cx("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand" : "bg-[#c9d6cf]")}>
      <span className={cx("absolute top-0.5 h-5 w-5 rounded-full bg-[#ffffff] shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
    </button>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "amber" | "rose" | "green" | "red" | "blue" | "violet" }) {
  const t = {
    neutral: "bg-porcelain text-mute border-line",
    amber: "bg-signal-soft text-signal-deep border-signal/25",
    rose: "bg-brand-soft text-brand-deep border-brand/25",
    green: "bg-ok-soft text-ok border-ok/25",
    red: "bg-signal-soft text-signal border-signal/30",
    blue: "bg-[#eaf1ee] text-[#2f5a4d] border-[#2f5a4d]/20",
    violet: "bg-warn-soft text-warn border-warn/30",
  }[tone];
  return <span className={cx("inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium", t)}>{children}</span>;
}

export const STATUS_TONE: Record<string, "neutral" | "amber" | "rose" | "green" | "red" | "blue" | "violet"> = {
  placed: "amber",
  accepted: "blue",
  preparing: "violet",
  ready: "green",
  served: "green",
  completed: "neutral",
  cancelled: "red",
};

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("tm-card rounded-2xl border border-line p-5", className)}>{children}</div>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl tracking-tight text-ink sm:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function Empty({ icon = "✦", title, text, action }: { icon?: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand/25 bg-surface/60 px-6 py-14 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft text-xl text-brand">{icon}</div>
      <p className="font-display text-xl text-ink">{title}</p>
      {text && <p className="mt-1 max-w-sm text-sm text-mute">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-20 text-mute" role="status">
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="rounded-2xl border border-signal/25 bg-signal-soft p-6 text-center" role="alert">
      <p className="text-sm text-signal-deep">{message}</p>
      {retry && (
        <Button className="mt-3" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  const id = useId();
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const k = (e: KeyboardEvent) => e.key === "Escape" && closeRef.current();
    const overflow = document.body.style.overflow;
    document.addEventListener("keydown", k);
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    return () => {
      document.removeEventListener("keydown", k);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-end justify-center bg-brand-night/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
          <motion.div
            ref={ref}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={id}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 30, opacity: 0 }}
            className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface p-6 text-ink shadow-[0_40px_100px_-30px_rgba(4,37,29,.6)] outline-none sm:rounded-3xl", wide ? "sm:max-w-3xl" : "sm:max-w-lg")}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 id={id} className="font-display text-2xl text-ink">
                {title}
              </h2>
              <button onClick={onClose} aria-label="Close" className="rounded-full p-2 text-mute transition hover:bg-brand-soft hover:text-ink">
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Animates the first number found in a formatted string (₹12,450 → counts up from 0). */
export function CountUp({ value, className }: { value: ReactNode; className?: string }) {
  const plain = typeof value === "string" || typeof value === "number";
  const text = plain ? String(value) : "";
  const m = text.match(/(\d[\d,]*)(\.\d+)?/);
  const target = m ? Number((m[1] + (m[2] ?? "")).replace(/,/g, "")) : NaN;
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    if (!Number.isFinite(target)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setShown(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  if (!plain) return <>{value}</>;
  if (!m || shown === null || !Number.isFinite(target)) return <span className={className}>{text}</span>;
  const decimals = m[2] ? m[2].length - 1 : 0;
  const grouped = m[1].includes(",");
  const num = grouped ? shown.toLocaleString("en-IN", { maximumFractionDigits: decimals, minimumFractionDigits: decimals }) : shown.toFixed(decimals);
  return <span className={className}>{text.slice(0, m.index)}{num}{text.slice((m.index ?? 0) + m[0].length)}</span>;
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: string; accent?: boolean }) {
  return (
    <div className={cx("tm-card rounded-2xl border p-5", accent ? "border-brand-deep !bg-gradient-to-br from-brand to-brand-deep" : "border-line")}>
      <p className={cx("text-xs uppercase tracking-wider", accent ? "text-[#f1ccd0]" : "text-mute")}>{label}</p>
      <p className={cx("mt-2 font-display text-3xl", accent ? "text-[#ffffff]" : "text-ink")}><CountUp value={value} /></p>
      {sub && <p className={cx("mt-1 text-xs", accent ? "text-[#e8b7bd]" : "text-mute")}>{sub}</p>}
    </div>
  );
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setData(await fnRef.current());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, error, loading, reload, setData };
}
