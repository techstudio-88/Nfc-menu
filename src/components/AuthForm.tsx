"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { Button, Field, Input } from "@/components/ui";

export function AuthForm({ mode, demo }: { mode: "login" | "signup"; demo: boolean }) {
  const router = useRouter();
  const [f, setF] = useState({ name: "", email: "", password: "", restaurantName: "", slug: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string) => setF((s) => ({ ...s, [k]: v }));

  const submit = async (e: React.FormEvent, override?: { email: string; password: string }) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const r = await api<{ home: string }>(`/api/auth/${mode}`, { body: override ?? f });
      router.push(r.home);
      router.refresh();
    } catch (er) {
      setErr(er instanceof Error ? er.message : "Something went wrong");
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900/70 p-7 shadow-2xl backdrop-blur">
      <h1 className="font-display text-3xl text-white">{mode === "login" ? "Welcome back" : "Open your restaurant"}</h1>
      <p className="mt-1 text-sm text-neutral-400">{mode === "login" ? "Sign in to your workspace." : "Your own isolated workspace, ready in seconds."}</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {mode === "signup" && (
          <>
            <Field label="Your name">
              <Input required value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Restaurant name">
              <Input required value={f.restaurantName} onChange={(e) => set("restaurantName", e.target.value)} placeholder="Ember & Crust" />
            </Field>
            <Field label="Menu URL" hint={`tapmenu.app/r/${f.slug || "your-restaurant"}`}>
              <Input value={f.slug} onChange={(e) => set("slug", e.target.value)} placeholder="your-restaurant" pattern="[a-zA-Z0-9\- ]{3,}" />
            </Field>
          </>
        )}
        <Field label="Email">
          <Input type="email" required value={f.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" />
        </Field>
        <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
          <Input type="password" required minLength={mode === "signup" ? 8 : 1} value={f.password} onChange={(e) => set("password", e.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} />
        </Field>
        {err && (
          <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {err}
          </p>
        )}
        <Button type="submit" variant="primary" size="lg" busy={busy} className="w-full">
          {mode === "login" ? "Sign in" : "Create workspace"}
        </Button>
      </form>
      {demo && mode === "login" && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <p className="mb-3 text-xs uppercase tracking-[.18em] text-neutral-500">Explore before you commit</p>
          <Button size="lg" disabled={busy} className="w-full" onClick={async () => {
            setErr("");
            setBusy(true);
            try {
              const r = await api<{ home: string }>("/api/auth/demo", { body: {} });
              router.push(r.home);
              router.refresh();
            } catch (er) {
              setErr(er instanceof Error ? er.message : "Could not start demo");
              setBusy(false);
            }
          }}>
            ✦ Launch a fresh demo workspace
          </Button>
          <p className="mt-3 text-center text-[11px] leading-5 text-neutral-500">A private sample restaurant is created for this demo session. Your changes won't affect anyone else's demo.</p>
        </div>
      )}
    </div>
  );
}
