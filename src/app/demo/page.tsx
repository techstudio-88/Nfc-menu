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
    <main className="demo-launch relative grid min-h-dvh place-items-center overflow-hidden bg-[#090608] px-5 py-12 text-white">
      <div className="demo-glow demo-glow-one pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full blur-[120px]" />
      <div className="demo-glow demo-glow-two pointer-events-none absolute -bottom-52 -right-40 h-[32rem] w-[32rem] rounded-full blur-[120px]" />
      <section className="demo-launch-card relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-rose-300/20 bg-[#160b10]/90 p-8 text-center shadow-2xl backdrop-blur-2xl sm:p-10">
        <div className="demo-orbit mx-auto mb-7 grid h-20 w-20 place-items-center rounded-[1.7rem] border border-rose-300/25 bg-gradient-to-br from-rose-500/20 to-red-950/50 text-3xl text-rose-100 shadow-[0_0_60px_rgba(190,35,65,.22)]">✦</div>
        <p className="text-[10px] font-semibold tracking-[.28em] text-rose-300">YOUR TAPMENU DEMO</p>
        <h1 className="mt-3 font-display text-4xl sm:text-5xl">Getting your demo ready</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-neutral-300/65">We are setting up a sample restaurant with dishes, tables and team pages. You can explore everything without changing a real restaurant.</p>
        {!error ? (
          <div className="mt-9">
            <div className="mx-auto flex max-w-sm items-center justify-between text-[10px] tracking-[.12em] text-rose-100/70"><span>CREATING WORKSPACE</span><span className="animate-pulse text-rose-300">PLEASE WAIT</span></div>
            <div className="demo-progress mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><span className="block h-full w-2/3 rounded-full bg-gradient-to-r from-rose-700 via-rose-400 to-red-300" /></div>
            <div className="mt-6 grid grid-cols-3 gap-2 text-left">
              <div className="rounded-xl border border-rose-300/15 bg-rose-500/[.06] p-3"><span className="text-lg">🍽️</span><p className="mt-2 text-[10px] text-white/65">Sample menu</p></div>
              <div className="rounded-xl border border-rose-300/15 bg-rose-500/[.06] p-3"><span className="text-lg">🪑</span><p className="mt-2 text-[10px] text-white/65">Tables & orders</p></div>
              <div className="rounded-xl border border-rose-300/15 bg-rose-500/[.06] p-3"><span className="text-lg">👨‍🍳</span><p className="mt-2 text-[10px] text-white/65">Team pages</p></div>
            </div>
            <p className="mt-5 flex items-center justify-center gap-3 text-xs text-rose-200"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Loading sample dishes and pages…</p>
          </div>
        ) : (
          <div role="alert" className="mt-7">
            <p className="text-sm text-rose-200">{error}</p>
            <button onClick={retry} className="mt-5 rounded-full border border-rose-300/30 px-5 py-3 text-xs tracking-wider hover:bg-rose-500/10">TRY AGAIN</button>
          </div>
        )}
      </section>
    </main>
  );
}
