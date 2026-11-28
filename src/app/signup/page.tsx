"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button, Field, Input, Textarea } from "@/components/ui";

export default function Page() {
  const [form, setForm] = useState({ name: "", restaurantName: "", email: "", phone: "", city: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const set = (key: string, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/access-request", { body: form });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit request.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div className="senso-auth-glow pointer-events-none absolute inset-0" />
      <section className="senso-auth-card relative w-full max-w-xl rounded-[2rem] border p-7 sm:p-10">
        <Link href="/" className="senso-wordmark block text-center text-2xl">TAPMENU</Link>
        {sent ? (
          <div className="py-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-brand text-2xl text-[#ffffff]" style={{ animation: "pop .5s cubic-bezier(.2,1.6,.4,1)" }}>✓</div>
            <h1 className="mt-6 font-display text-4xl text-ink">Request received.</h1>
            <p className="mt-4 text-sm leading-7 text-mute">Your request is in the TechStudio admin queue. Workspace access is granted after approval.</p>
          </div>
        ) : (
          <>
            <p className="mt-9 text-center text-[10px] font-semibold tracking-[.25em] text-signal">WORKSPACE ACCESS REQUEST</p>
            <h1 className="mt-4 text-center font-display text-4xl text-ink sm:text-5xl">Let’s bring your<br /><em className="text-brand">restaurant online.</em></h1>
            <p className="mx-auto mt-4 max-w-md text-center text-sm leading-7 text-mute">No public self-signup. Send your details and the TechStudio team will review and create your restaurant workspace.</p>
            <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
              <Field label="Your name"><Input required maxLength={100} value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="name" /></Field>
              <Field label="Restaurant name"><Input required maxLength={120} value={form.restaurantName} onChange={(e) => set("restaurantName", e.target.value)} /></Field>
              <Field label="Email"><Input required type="email" maxLength={180} value={form.email} onChange={(e) => set("email", e.target.value)} autoComplete="email" /></Field>
              <Field label="Phone / WhatsApp"><Input maxLength={40} value={form.phone} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" /></Field>
              <div className="sm:col-span-2"><Field label="City"><Input maxLength={100} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field></div>
              <div className="sm:col-span-2"><Field label="Anything we should know?"><Textarea maxLength={1000} rows={3} value={form.message} onChange={(e) => set("message", e.target.value)} /></Field></div>
              {error && <p role="alert" className="rounded-lg border border-signal/25 bg-signal-soft px-3 py-2 text-sm text-signal-deep sm:col-span-2">{error}</p>}
              <Button type="submit" variant="primary" size="lg" busy={busy} className="w-full sm:col-span-2">{busy ? "Sending request…" : "Send access request ↗"}</Button>
            </form>
          </>
        )}
        <div className="mt-7 flex flex-col items-center gap-3 text-sm text-mute">
          <Link href="/login" className="hover:text-ink">Already have credentials? <span className="font-medium text-brand">Log in</span></Link>
          <Link href="/" className="text-xs hover:text-ink">Back to TapMenu</Link>
        </div>
      </section>
    </main>
  );
}
