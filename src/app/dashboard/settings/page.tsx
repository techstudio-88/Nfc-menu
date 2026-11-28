/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { PRESETS, MENU_THEMES, themeColors, normalizeTheme } from "@/lib/theme";
import { useEffect, useState } from "react";
import { api, playSound, unlockAudio } from "@/lib/client";
import { LANGS } from "@/lib/i18n";
import { formatMoney } from "@/lib/pricing";
import { AssetUpload, crud, MoneyInput, Tabs, type Row } from "@/components/forms";
import { Badge, Button, Card, ErrorState, Field, Input, Loading, Modal, PageHeader, Select, Textarea, Toggle, useAsync, useToast } from "@/components/ui";

export default function Settings() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync<any>(() => api("/api/owner/settings"), []);
  const [tab, setTab] = useState<"brand" | "money" | "ops" | "coupons" | "plan">("brand");
  const [r, setR] = useState<Row>({});
  const [s, setS] = useState<Row>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data) {
      setR(data.restaurant);
      setS(data.settings);
    }
  }, [data]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Failed"} retry={reload} />;

  const save = async (body: Row, msg = "Saved") => {
    setBusy(true);
    try {
      await api("/api/owner/settings", { method: "PATCH", body });
      toast(msg);
      reload(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
    } finally {
      setBusy(false);
    }
  };
  const langs: string[] = r.languages ?? ["en"];

  return (
    <div>
      <PageHeader title="Settings" sub={`${data.restaurant.name} · tapmenu.app/r/${data.restaurant.slug}`} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "brand", label: "Branding" }, { id: "money", label: "Tax, fees & payments" }, { id: "ops", label: "Alerts & ordering" }, { id: "coupons", label: "Coupons" }, { id: "plan", label: "Plan & support" }]} />

      {tab === "brand" && (
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <Card className="space-y-4">
            <Field label="Restaurant name"><Input value={r.name ?? ""} onChange={(e) => setR({ ...r, name: e.target.value })} /></Field>
            <Field label="Tagline"><Input value={r.tagline ?? ""} onChange={(e) => setR({ ...r, tagline: e.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <AssetUpload kind="logo" label="Logo" assetId={r.logoAssetId} onChange={(id) => { setR({ ...r, logoAssetId: id }); void save({ logoAssetId: id }, "Logo updated"); }} />
              <AssetUpload kind="image" label="Cover image" assetId={r.coverAssetId} onChange={(id) => { setR({ ...r, coverAssetId: id }); void save({ coverAssetId: id }, "Cover updated"); }} />
            </div>
            <Field label="Colour palette">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PRESETS.map((pr) => {
                  const on = themeColors(r.primaryColor, r.accentColor).primary.toLowerCase() === pr.primary;
                  return (
                    <button key={pr.id} type="button" onClick={() => setR({ ...r, primaryColor: pr.primary, accentColor: pr.accent })} aria-pressed={on} className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition hover:-translate-y-0.5 ${on ? "border-brand ring-4 ring-brand/15" : "border-line"}`}>
                      <span className="flex -space-x-1.5"><span className="h-6 w-6 rounded-full border-2 border-white" style={{ background: pr.primary }} /><span className="h-6 w-6 rounded-full border-2 border-white" style={{ background: pr.accent }} /></span>
                      <span className="text-ink">{pr.name}</span>
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Primary colour"><div className="flex gap-2"><input type="color" aria-label="Primary colour" value={themeColors(r.primaryColor, r.accentColor).primary} onChange={(e) => setR({ ...r, primaryColor: e.target.value })} className="h-10 w-14 rounded-lg border border-line bg-transparent" /><Input value={r.primaryColor ?? ""} onChange={(e) => setR({ ...r, primaryColor: e.target.value })} /></div></Field>
              <Field label="Accent colour"><div className="flex gap-2"><input type="color" aria-label="Accent colour" value={themeColors(r.primaryColor, r.accentColor).accent} onChange={(e) => setR({ ...r, accentColor: e.target.value })} className="h-10 w-14 rounded-lg border border-line bg-transparent" /><Input value={r.accentColor ?? ""} onChange={(e) => setR({ ...r, accentColor: e.target.value })} /></div></Field>
            </div>
            <Field label="Guest menu theme">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {MENU_THEMES.map((m) => (
                  <button key={m.id} type="button" onClick={() => setR({ ...r, theme: m.id })} aria-pressed={normalizeTheme(r.theme) === m.id} className={`rounded-xl border p-3 text-sm transition ${normalizeTheme(r.theme) === m.id ? "border-brand ring-4 ring-brand/15" : "border-line"}`} style={{ background: m.bg, color: m.id === "midnight" || m.id === "ember" ? "#eee" : "#222" }}>{m.name}</button>
                ))}
              </div>
            </Field>
            <Field label="Menu languages" hint="Customers can switch between these. Add translations on each dish.">
              <div className="flex flex-wrap gap-2">
                {Object.entries(LANGS).map(([k, v]) => (
                  <button key={k} onClick={() => setR({ ...r, languages: langs.includes(k) ? langs.filter((x) => x !== k) : [...langs, k] })} aria-pressed={langs.includes(k)} className={`rounded-full border px-3 py-1.5 text-sm ${langs.includes(k) ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-white/10 text-neutral-400"}`}>{v.name}</button>
                ))}
              </div>
            </Field>
            <Field label="Default language"><Select value={r.defaultLanguage} onChange={(e) => setR({ ...r, defaultLanguage: e.target.value })}>{langs.map((l) => <option key={l} value={l}>{LANGS[l]?.name}</option>)}</Select></Field>
            <Button variant="primary" busy={busy} onClick={() => save({ name: r.name, tagline: r.tagline, primaryColor: r.primaryColor, accentColor: r.accentColor, theme: r.theme, languages: langs, defaultLanguage: r.defaultLanguage }, "Branding saved").then(() => window.location.reload())}>Save branding</Button>
          </Card>
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Live preview</p>
            {(() => {
              const th = normalizeTheme(r.theme); const c = themeColors(r.primaryColor, r.accentColor); const dark = th === "midnight" || th === "ember";
              const bg = MENU_THEMES.find((x) => x.id === th)?.bg ?? "#faf6f1";
              return (
                <div className="overflow-hidden rounded-3xl border border-line p-6 transition-colors duration-500" style={{ background: bg, color: dark ? "#f5f1ea" : "#1f1416" }}>
                  <p className="text-[10px] uppercase tracking-[0.35em] opacity-60">Welcome to</p>
                  <p className="font-display mt-2 text-4xl">{r.name}</p>
                  <p className="mt-1 text-sm italic opacity-60">{r.tagline}</p>
                  <div className="mt-5 flex gap-2 text-[11px] font-medium"><span className="rounded-full px-3 py-1.5 text-white" style={{ background: c.primary }}>Burgers</span><span className="rounded-full border px-3 py-1.5 opacity-70" style={{ borderColor: c.primary }}>Sides</span><span className="rounded-full border px-3 py-1.5 opacity-70" style={{ borderColor: c.primary }}>Drinks</span></div>
                  <div className="mt-5 flex gap-2">
                    <span className="rounded-full px-4 py-2 text-sm font-semibold text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.primary})` }}>Add to bag · ₹349</span>
                    <span className="rounded-full border px-4 py-2 text-sm" style={{ borderColor: c.primary, color: c.primary }}>Customise</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {tab === "money" && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="space-y-4">
            <h2 className="font-display text-2xl text-white">Tax, service & fees</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Currency (ISO)"><Input value={s.currency ?? ""} maxLength={3} onChange={(e) => setS({ ...s, currency: e.target.value.toUpperCase() })} /></Field>
              <Field label="Timezone" hint="Used for schedules & daily reports"><Input value={s.timezone ?? ""} onChange={(e) => setS({ ...s, timezone: e.target.value })} placeholder="America/New_York" /></Field>
              <Field label="Tax label"><Input value={s.taxLabel ?? ""} onChange={(e) => setS({ ...s, taxLabel: e.target.value })} /></Field>
              <Field label="Tax rate (%)"><Input type="number" step="0.01" min={0} value={(s.taxRateBps ?? 0) / 100} onChange={(e) => setS({ ...s, taxRateBps: Math.round(Number(e.target.value) * 100) })} /></Field>
              <Field label="Service charge (%)"><Input type="number" step="0.01" min={0} value={(s.serviceChargeBps ?? 0) / 100} onChange={(e) => setS({ ...s, serviceChargeBps: Math.round(Number(e.target.value) * 100) })} /></Field>
              <Field label="Automatic discount (%)" hint="Applied to every order"><Input type="number" step="0.01" min={0} value={(s.autoDiscountBps ?? 0) / 100} onChange={(e) => setS({ ...s, autoDiscountBps: Math.round(Number(e.target.value) * 100) })} /></Field>
              <Field label="Fixed fee label"><Input value={s.feeLabel ?? ""} onChange={(e) => setS({ ...s, feeLabel: e.target.value })} /></Field>
              <Field label="Fixed fee per order"><MoneyInput value={s.feeCents ?? 0} onChange={(c) => setS({ ...s, feeCents: c })} /></Field>
            </div>
            <p className="text-xs text-neutral-500">Example: a {formatMoney(2000, s.currency || "INR")} order → {formatMoney(2000 + Math.round(2000 * (s.taxRateBps ?? 0) / 10000) + Math.round(2000 * (s.serviceChargeBps ?? 0) / 10000) + (s.feeCents ?? 0) - Math.round(2000 * (s.autoDiscountBps ?? 0) / 10000), s.currency || "INR")} (approx.) at checkout.</p>
            <Button variant="primary" busy={busy} onClick={() => save({ currency: s.currency, timezone: s.timezone, taxLabel: s.taxLabel, taxRateBps: s.taxRateBps, serviceChargeBps: s.serviceChargeBps, autoDiscountBps: s.autoDiscountBps, feeLabel: s.feeLabel, feeCents: s.feeCents }, "Pricing saved")}>Save pricing</Button>
          </Card>
          <Card className="space-y-4">
            <h2 className="font-display text-2xl text-white">Payment methods</h2>
            {[["cash", "Cash at the table", "Settled by staff when the order is completed or marked paid."], ["card_at_table", "Card at the table", "Staff brings a card terminal; marked paid by staff."], ["online", "Pay online", "Stripe Checkout — customers pay on their phone."]].map(([k, n, h]) => (
              <label key={k} className="flex items-start gap-3 rounded-xl border border-white/10 p-3">
                <Toggle checked={!!s.paymentMethods?.[k]} onChange={(v) => setS({ ...s, paymentMethods: { ...s.paymentMethods, [k]: v } })} label={n} />
                <span><span className="block text-sm text-white">{n}</span><span className="text-xs text-neutral-500">{h}</span>
                  {k === "online" && (data.integrations.stripe ? <Badge tone="green">Stripe connected</Badge> : <Badge tone="amber">Set STRIPE_SECRET_KEY on the server to activate</Badge>)}</span>
              </label>
            ))}
            <Button variant="primary" busy={busy} onClick={() => save({ paymentMethods: s.paymentMethods }, "Payment methods saved")}>Save payment methods</Button>
          </Card>
        </div>
      )}

      {tab === "ops" && (
        <Card className="max-w-2xl space-y-5">
          <label className="flex items-center gap-3 text-sm text-neutral-200"><Toggle checked={!!s.orderingEnabled} onChange={(v) => setS({ ...s, orderingEnabled: v })} label="Ordering enabled" /> Accept new orders (turn off to pause ordering)</label>
          <label className="flex items-center gap-3 text-sm text-neutral-200"><Toggle checked={!!s.autoAccept} onChange={(v) => setS({ ...s, autoAccept: v })} label="Auto-accept" /> Auto-accept new orders (skips the “Accept” step)</label>
          <label className="flex items-center gap-3 text-sm text-neutral-200"><Toggle checked={!!s.soundEnabled} onChange={(v) => setS({ ...s, soundEnabled: v })} label="Sound alerts" /> Play a sound on new orders (owner, kitchen & floor screens)</label>
          <Field label="New-order sound">
            <div className="flex gap-2"><Select value={s.newOrderSound} onChange={(e) => setS({ ...s, newOrderSound: e.target.value })}>{["chime", "bell", "pulse", "none"].map((x) => <option key={x}>{x}</option>)}</Select>
              <Button onClick={() => { unlockAudio(); if (!playSound(s.newOrderSound)) toast("Click once more — the browser needs a user gesture to unlock audio", "info"); }}>▶ Test</Button></div>
          </Field>
          <Button variant="primary" busy={busy} onClick={() => save({ orderingEnabled: s.orderingEnabled, autoAccept: s.autoAccept, soundEnabled: s.soundEnabled, newOrderSound: s.newOrderSound }, "Preferences saved")}>Save preferences</Button>
          <p className="text-xs text-neutral-500">AI summaries use <b>{data.integrations.ai}</b>. Set OPENAI_API_KEY or ANTHROPIC_API_KEY on the server for LLM summaries; otherwise a deterministic summariser is used. Every AI output is checked so no modification is dropped.</p>
        </Card>
      )}
      {tab === "coupons" && <Coupons currency={s.currency} />}
      {tab === "plan" && <PlanSupport data={data} />}
    </div>
  );
}

function Coupons({ currency }: { currency: string }) {
  const toast = useToast();
  const c = useAsync<Row[]>(() => crud.list("coupons"), []);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState<Row>({ code: "", kind: "percent", value: 1000, minSubtotal: 0, maxUses: "" });
  if (c.loading && !c.data) return <Loading />;
  return (
    <div className="space-y-3">
      <Button variant="primary" onClick={() => setOpen(true)}>+ New coupon</Button>
      {(c.data ?? []).length === 0 && <p className="text-sm text-neutral-500">No coupons yet.</p>}
      {(c.data ?? []).map((x) => (
        <Card key={x.id} className="flex flex-wrap items-center gap-4 !p-4">
          <p className="font-mono text-lg text-amber-300">{x.code}</p>
          <p className="text-sm text-neutral-300">{x.kind === "percent" ? `${x.value / 100}% off` : `${formatMoney(x.value, currency)} off`}{x.minSubtotal ? ` · min ${formatMoney(x.minSubtotal, currency)}` : ""}</p>
          <p className="text-xs text-neutral-500">used {x.usedCount}{x.maxUses ? ` / ${x.maxUses}` : ""}</p>
          <div className="ml-auto flex items-center gap-3"><Toggle checked={x.active} onChange={(v) => crud.update("coupons", x.id, { active: v }).then(() => c.reload(true))} label="Active" /><Button size="sm" variant="danger" onClick={async () => { await crud.remove("coupons", x.id); c.reload(true); }}>✕</Button></div>
        </Card>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="New coupon">
        <div className="space-y-4">
          <Field label="Code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} placeholder="SUMMER15" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><Select value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value, value: e.target.value === "percent" ? 1000 : 500 })}><option value="percent">Percent</option><option value="fixed">Fixed amount</option></Select></Field>
            <Field label={f.kind === "percent" ? "Percent off" : "Amount off"}>{f.kind === "percent" ? <Input type="number" min={1} max={100} value={f.value / 100} onChange={(e) => setF({ ...f, value: Math.round(Number(e.target.value) * 100) })} /> : <MoneyInput value={f.value} onChange={(v) => setF({ ...f, value: v })} />}</Field>
            <Field label="Minimum subtotal"><MoneyInput value={f.minSubtotal} onChange={(v) => setF({ ...f, minSubtotal: v })} /></Field>
            <Field label="Max uses" hint="Empty = unlimited"><Input type="number" min={1} value={f.maxUses} onChange={(e) => setF({ ...f, maxUses: e.target.value })} /></Field>
          </div>
          <Button variant="primary" className="w-full" onClick={async () => { try { await crud.create("coupons", { ...f, maxUses: f.maxUses === "" ? null : Number(f.maxUses) }); setOpen(false); toast("Coupon created"); c.reload(true); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "err"); } }}>Create coupon</Button>
        </div>
      </Modal>
    </div>
  );
}

function PlanSupport({ data }: { data: any }) {
  const toast = useToast();
  const sup = useAsync<Row[]>(() => crud.list("support"), []);
  const [f, setF] = useState({ subject: "", message: "" });
  const p = data.plan;
  const bar = (n: number, max: number) => <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (n / Math.max(1, max)) * 100)}%` }} /></div>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h2 className="font-display text-2xl text-white">Subscription</h2>
        {p ? (
          <>
            <p className="mt-2 text-neutral-300">{p.name} · {formatMoney(p.priceCents, "INR")}/{p.interval} <Badge tone={data.subscription?.status === "active" ? "green" : "amber"}>{data.subscription?.status}</Badge></p>
            {data.subscription?.currentPeriodEnd && <p className="text-xs text-neutral-500">Current period ends {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}</p>}
            <div className="mt-4 space-y-3 text-sm">
              {[["Branches", data.usage.branches, p.maxBranches], ["Tables", data.usage.tables, p.maxTables], ["Menu items", data.usage.items, p.maxMenuItems], ["Team members", data.usage.employees, p.maxEmployees]].map(([l, n, m]) => (
                <div key={l as string}><div className="flex justify-between text-neutral-300"><span>{l}</span><span>{n as number} / {m as number}</span></div>{bar(n as number, m as number)}</div>
              ))}
            </div>
            <p className="mt-4 text-xs text-neutral-500">To change plan, contact platform support below.</p>
          </>
        ) : <p className="text-sm text-neutral-500">No subscription.</p>}
      </Card>
      <Card>
        <h2 className="font-display text-2xl text-white">Contact support</h2>
        <div className="mt-3 space-y-3">
          <Input placeholder="Subject" value={f.subject} onChange={(e) => setF({ ...f, subject: e.target.value })} />
          <Textarea placeholder="How can we help?" value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} />
          <Button variant="primary" disabled={!f.subject || !f.message} onClick={async () => { try { await crud.create("support", f); setF({ subject: "", message: "" }); toast("Request sent"); sup.reload(true); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "err"); } }}>Send request</Button>
        </div>
        <ul className="mt-5 space-y-2">
          {(sup.data ?? []).map((x) => (
            <li key={x.id} className="rounded-xl bg-white/5 p-3 text-sm">
              <p className="flex justify-between text-white">{x.subject}<Badge tone={x.status === "open" ? "amber" : "green"}>{x.status}</Badge></p>
              <p className="mt-1 text-neutral-400">{x.message}</p>
              {x.reply && <p className="mt-2 rounded-lg bg-amber-500/10 p-2 text-amber-100">Reply: {x.reply}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
