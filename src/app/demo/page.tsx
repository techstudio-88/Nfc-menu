"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function DemoLaunchPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    let active = true;
    (async () => {
      try {
        const result = await api<{ home: string }>("/api/auth/demo", { body: {} });
        if (active) {
          router.replace(result.home || "/dashboard");
          router.refresh();
        }
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : "We could not start the demo. Please try again.");
      }
    })();
    return () => { active = false; };
  }, [router]);
  const retry = () => { started.current = false; setError(""); window.location.reload(); };
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-5 py-12">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-brand/15 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-52 -right-40 h-[32rem] w-[32rem] rounded-full bg-signal/10 blur-[120px]" />
      <section className="demo-card relative w-full max-w-xl rounded-[2rem] border border-line bg-surface p-8 text-center sm:p-10">
        <div className="relative mx-auto mb-8 grid h-24 w-24 place-items-center" aria-hidden="true">
          <span className="absolute inset-0 rounded-full border border-brand/40" style={{ animation: "tm-ripple 2.6s ease-out infinite" }} />
          <span className="absolute inset-0 rounded-full border border-brand/40" style={{ animation: "tm-ripple 2.6s ease-out 1.3s infinite" }} />
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-brand-bright to-brand-deep text-2xl text-[#ffffff] shadow-[0_16px_34px_-12px_rgba(8,118,83,.7)]">✦</span>
        </div>
        <p className="text-[10px] font-semibold tracking-[.28em] text-signal">YOUR TAPMENU DEMO</p>
        <h1 className="mt-3 font-display text-4xl text-ink sm:text-5xl">Getting your demo ready</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-mute">We are setting up a sample restaurant with dishes, tables and team pages. Explore everything without touching a real restaurant.</p>
        {!error ? (
          <div className="mt-9" role="status">
            <div className="mx-auto flex max-w-sm items-center justify-between text-[10px] tracking-[.12em] text-brand-deep"><span>CREATING WORKSPACE</span><span className="animate-pulse">PLEASE WAIT</span></div>
            <div className="tm-progress mx-auto mt-3 h-1.5 max-w-sm rounded-full bg-brand-soft"><span className="bg-gradient-to-r from-brand to-brand-bright" /></div>
            <div className="mt-7 grid grid-cols-3 gap-2 text-left">
              {[["Sample menu", "Dishes & 3D"], ["Tables & orders", "Live flow"], ["Team pages", "Kitchen & floor"]].map(([a, b]) => <div key={a} className="rounded-xl border border-line bg-porcelain p-3"><p className="text-[11px] font-semibold text-ink">{a}</p><p className="mt-1 text-[10px] text-mute">{b}</p></div>)}
            </div>
          </div>
        ) : (
          <div role="alert" className="mt-7">
            <p className="rounded-xl border border-signal/25 bg-signal-soft px-4 py-3 text-sm text-signal-deep">{error}</p>
            <button onClick={retry} className="mt-5 rounded-full bg-brand px-6 py-3 text-xs font-semibold tracking-wider text-[#ffffff] transition hover:bg-brand-deep">TRY AGAIN</button>
          </div>
        )}
      </section>
    </main>
  );
}
