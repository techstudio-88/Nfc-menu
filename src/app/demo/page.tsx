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
        if (active) setError(e instanceof Error ? e.message : "We couldn't start your demo. Please try again.");
      }
    })();
    return () => { active = false; };
  }, [router]);
  const retry = () => { started.current = false; setError(""); window.location.reload(); };
  return <main className="relative grid min-h-dvh place-items-center overflow-hidden bg-[#09090c] px-5 text-white">
    <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-rose-700/20 blur-[120px]" />
    <section className="relative w-full max-w-md rounded-3xl border border-rose-300/15 bg-white/[.045] p-8 text-center shadow-2xl backdrop-blur-xl">
      <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-2xl border border-rose-300/20 bg-rose-500/10 text-2xl text-rose-200 shadow-[0_0_50px_rgba(190,35,65,.18)]">✦</div>
      <p className="text-[10px] tracking-[.28em] text-rose-300">TAPMENU EXPERIENCE</p>
      <h1 className="mt-3 font-display text-3xl">Preparing your restaurant</h1>
      <p className="mt-3 text-sm leading-6 text-neutral-400">Creating a fresh private demo workspace with sample dishes, tables, NFC cards and team access.</p>
      {!error ? <div className="mt-8 flex items-center justify-center gap-3 text-xs text-rose-200"><span className="h-2 w-2 animate-pulse rounded-full bg-rose-400" /> Setting up your experience…</div> : <div role="alert" className="mt-7"><p className="text-sm text-rose-200">{error}</p><button onClick={retry} className="mt-5 rounded-full border border-rose-300/30 px-5 py-3 text-xs tracking-wider hover:bg-rose-500/10">TRY AGAIN</button></div>}
    </section>
  </main>;
}
