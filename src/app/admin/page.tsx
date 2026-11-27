/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import { Tabs, type Row } from "@/components/forms";
import { Badge, Button, Card, Empty, ErrorState, Field, Input, Loading, Modal, PageHeader, Select, Stat, Textarea, Toggle, useAsync, useToast } from "@/components/ui";

type Tab = "overview" | "access" | "restaurants" | "plans" | "payments" | "support" | "config";
const get = (r: string) => api<any>(`/api/admin?r=${r}`);
const post = (body: Row) => api("/api/admin", { body });

export default function Admin() {
  const [tab, setTab] = useState<Tab>("overview");
  return (
    <div>
      <PageHeader title="Platform console" sub="Restaurants, subscriptions, revenue and support across TapMenu 3D." />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "overview", label: "Overview" }, { id: "access", label: "Access requests" }, { id: "restaurants", label: "Restaurants" }, { id: "plans", label: "Plans" }, { id: "payments", label: "Payments" }, { id: "support", label: "Support" }, { id: "config", label: "Configuration" }]} />
      {tab === "overview" && <Overview />}
      {tab === "access" && <AccessRequests />}
      {tab === "restaurants" && <Restaurants />}
      {tab === "plans" && <Plans />}
      {tab === "payments" && <Payments />}
      {tab === "support" && <Support />}
      {tab === "config" && <Config />}
    </div>
  );
}

function Spark({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(1, ...data);
  return (
    <div className="flex h-24 items-end gap-1" role="img" aria-label={label}>
      {data.map((v, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-orange-600 to-amber-300" style={{ height: `${Math.max(3, (v / max) * 100)}%` }} title={String(v)} />)}
    </div>
  );
}

function Overview() {
  const q = useAsync<any>(() => get("overview"), []);
  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Failed"} retry={q.reload} />;
  const d = q.data;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <Stat label="Restaurants" value={d.restaurants.total} sub={`${d.restaurants.active} active · ${d.restaurants.suspended} suspended`} accent />
        <Stat label="MRR" value={formatMoney(d.subscriptions.mrr, "INR")} sub={`${d.subscriptions.active} paying`} />
        <Stat label="Trials" value={d.subscriptions.trialing} />
        <Stat label="Orders processed" value={d.orders.orders} />
        <Stat label="Paid GMV" value={formatMoney(Math.round(d.orders.gmv), "INR")} sub={`${d.openSupport} open support`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card><h2 className="font-display mb-3 text-2xl text-white">Orders · last 14 days</h2>{d.ordersTrend.length ? <Spark label="Orders per day" data={d.ordersTrend.map((x: any) => x.n)} /> : <p className="py-8 text-center text-sm text-neutral-500">No orders yet.</p>}</Card>
        <Card><h2 className="font-display mb-3 text-2xl text-white">Sign-ups · last 30 days</h2>{d.signups.length ? <Spark label="Sign-ups per day" data={d.signups.map((x: any) => x.n)} /> : <p className="py-8 text-center text-sm text-neutral-500">No sign-ups yet.</p>}</Card>
      </div>
    </div>
  );
}

function Restaurants() {
  const toast = useToast();
  const q = useAsync<any>(() => get("restaurants"), []);
  const pl = useAsync<any>(() => get("plans"), []);
  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Failed"} retry={q.reload} />;
  const run = async (body: Row, msg: string) => {
    try { await post(body); toast(msg); q.reload(true); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "err"); }
  };
  return (
    <div className="space-y-3">
      {q.data.rows.length === 0 && <Empty title="No restaurants" />}
      {q.data.rows.map((r: any) => (
        <Card key={r.id} className="!p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="min-w-[200px] flex-1">
              <p className="font-display text-2xl text-white">{r.name} <Badge tone={r.status === "active" ? "green" : "red"}>{r.status}</Badge></p>
              <p className="text-xs text-neutral-500">/r/{r.slug} · {r.owner} · joined {new Date(r.createdAt).toLocaleDateString()}</p>
            </div>
            <div className="text-xs text-neutral-400">
              <p>{r.branches} branches · {r.tables} tables · {r.items} dishes · {r.employees} staff</p>
              <p>{r.orders30} orders · {formatMoney(r.revenue30, "INR")} (30d)</p>
            </div>
            <Select aria-label="Plan" className="!w-auto" value={r.planId ?? ""} onChange={(e) => run({ action: "setPlan", restaurantId: r.id, planId: e.target.value, status: r.subStatus ?? "active" }, "Plan updated")}>
              {(pl.data?.rows ?? []).map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </Select>
            <Select aria-label="Subscription status" className="!w-auto" value={r.subStatus ?? "active"} onChange={(e) => run({ action: "setPlan", restaurantId: r.id, planId: r.planId, status: e.target.value }, "Subscription updated")}>
              {["trialing", "active", "past_due", "canceled"].map((s) => <option key={s}>{s}</option>)}
            </Select>
            <label className="flex items-center gap-2 text-xs text-neutral-300"><Toggle checked={r.status === "active"} onChange={(v) => run({ action: "setStatus", restaurantId: r.id, status: v ? "active" : "suspended" }, v ? "Restaurant activated" : "Restaurant suspended")} label={`${r.name} active`} /> {r.status === "active" ? "active" : "suspended"}</label>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Plans() {
  const toast = useToast();
  const q = useAsync<any>(() => get("plans"), []);
  const [edit, setEdit] = useState<Row | null>(null);
  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Failed"} retry={q.reload} />;
  return (
    <div className="space-y-3">
      <Button variant="primary" onClick={() => setEdit({ code: "", name: "", priceCents: 0, maxBranches: 1, maxTables: 10, maxMenuItems: 50, maxEmployees: 5, active: true })}>+ New plan</Button>
      <div className="grid gap-4 md:grid-cols-3">
        {q.data.rows.map((p: any) => (
          <Card key={p.id}>
            <p className="font-display text-2xl text-white">{p.name} {!p.active && <Badge tone="red">inactive</Badge>}</p>
            <p className="mt-1 text-3xl text-amber-300">{formatMoney(p.priceCents, "INR")}<span className="text-sm text-neutral-500"> /{p.interval}</span></p>
            <ul className="mt-3 space-y-1 text-sm text-neutral-300"><li>{p.maxBranches} branches</li><li>{p.maxTables} tables</li><li>{p.maxMenuItems} dishes</li><li>{p.maxEmployees} team members</li></ul>
            <Button className="mt-4" size="sm" onClick={() => setEdit(p)}>Edit</Button>
          </Card>
        ))}
      </div>
      {edit && (
        <Modal open onClose={() => setEdit(null)} title={edit.id ? "Edit plan" : "New plan"}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Code"><Input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></Field>
            <Field label="Name"><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
            <Field label="Price (cents/month)"><Input type="number" value={edit.priceCents} onChange={(e) => setEdit({ ...edit, priceCents: Number(e.target.value) })} /></Field>
            <Field label="Max branches"><Input type="number" value={edit.maxBranches} onChange={(e) => setEdit({ ...edit, maxBranches: Number(e.target.value) })} /></Field>
            <Field label="Max tables"><Input type="number" value={edit.maxTables} onChange={(e) => setEdit({ ...edit, maxTables: Number(e.target.value) })} /></Field>
            <Field label="Max dishes"><Input type="number" value={edit.maxMenuItems} onChange={(e) => setEdit({ ...edit, maxMenuItems: Number(e.target.value) })} /></Field>
            <Field label="Max team"><Input type="number" value={edit.maxEmployees} onChange={(e) => setEdit({ ...edit, maxEmployees: Number(e.target.value) })} /></Field>
            <label className="flex items-center gap-2 pt-6 text-sm text-neutral-300"><Toggle checked={edit.active} onChange={(v) => setEdit({ ...edit, active: v })} label="Active" /> Active</label>
          </div>
          <Button variant="primary" className="mt-5 w-full" onClick={async () => { try { await post({ action: "savePlan", ...edit }); toast("Plan saved"); setEdit(null); q.reload(true); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "err"); } }}>Save plan</Button>
        </Modal>
      )}
    </div>
  );
}

function Payments() {
  const q = useAsync<any>(() => get("payments"), []);
  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Failed"} retry={q.reload} />;
  if (!q.data.rows.length) return <Empty icon="💳" title="No payment records yet" />;
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead className="text-xs uppercase tracking-wider text-neutral-500"><tr><th className="py-2">Restaurant</th><th>Order</th><th>Method</th><th>Provider</th><th>Status</th><th className="text-right">Amount</th><th className="text-right">Date</th></tr></thead>
        <tbody className="divide-y divide-white/5">
          {q.data.rows.map((p: any) => (
            <tr key={p.id}><td className="py-2 text-white">{p.restaurant}</td><td>#{p.orderNo}</td><td className="capitalize">{p.method.replace(/_/g, " ")}</td><td>{p.provider}</td><td><Badge tone={p.status === "paid" ? "green" : p.status === "pending" ? "amber" : "red"}>{p.status}</Badge></td><td className="text-right tabular-nums">{formatMoney(p.amount, p.currency)}</td><td className="text-right text-xs text-neutral-500">{new Date(p.createdAt).toLocaleString()}</td></tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function Support() {
  const toast = useToast();
  const q = useAsync<any>(() => get("support"), []);
  const [reply, setReply] = useState<Record<string, string>>({});
  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Failed"} retry={q.reload} />;
  if (!q.data.rows.length) return <Empty icon="💬" title="No support requests" text="Restaurant owners can contact you from their settings page." />;
  return (
    <div className="space-y-3">
      {q.data.rows.map((s: any) => (
        <Card key={s.id}>
          <p className="flex items-center justify-between text-white"><span><b>{s.subject}</b> <span className="text-sm text-neutral-500">· {s.restaurant}</span></span><Badge tone={s.status === "open" ? "amber" : "green"}>{s.status}</Badge></p>
          <p className="mt-1 text-sm text-neutral-300">{s.message}</p>
          {s.reply && <p className="mt-2 rounded-lg bg-white/5 p-2 text-sm text-neutral-300">Reply: {s.reply}</p>}
          <div className="mt-3 flex gap-2">
            <Textarea className="!min-h-12" placeholder="Write a reply…" value={reply[s.id] ?? ""} onChange={(e) => setReply({ ...reply, [s.id]: e.target.value })} />
            <div className="flex flex-col gap-2">
              <Button size="sm" variant="primary" disabled={!reply[s.id]} onClick={async () => { await post({ action: "replySupport", id: s.id, reply: reply[s.id], status: "answered" }); toast("Reply sent"); q.reload(true); }}>Reply</Button>
              <Button size="sm" onClick={async () => { await post({ action: "replySupport", id: s.id, reply: s.reply, status: "closed" }); q.reload(true); }}>Close</Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function Config() {
  const toast = useToast();
  const q = useAsync<any>(() => get("config"), []);
  const [v, setV] = useState<Record<string, string>>({});
  useEffect(() => {
    if (q.data) setV(Object.fromEntries(q.data.rows.map((r: any) => [r.key, String(r.value)])));
  }, [q.data]);
  if (q.loading && !q.data) return <Loading />;
  const keys = [["announcement", "Platform announcement", "Shown to restaurant owners"], ["trialDays", "Default trial length (days)", "Applied to new sign-ups"], ["supportEmail", "Support email", "Displayed to restaurants"]];
  return (
    <Card className="max-w-xl space-y-4">
      {keys.map(([k, l, h]) => <Field key={k} label={l} hint={h}><Input value={v[k] ?? ""} onChange={(e) => setV({ ...v, [k]: e.target.value })} /></Field>)}
      <Button variant="primary" onClick={async () => { for (const [k] of keys) await post({ action: "setConfig", key: k, value: v[k] ?? "" }); toast("Configuration saved"); q.reload(true); }}>Save configuration</Button>
      <p className="text-xs text-neutral-500">Server-side secrets (Stripe, AI keys, AUTH_SECRET) are environment variables and are never shown here.</p>
    </Card>
  );
}

function AccessRequests() {
  const toast = useToast();
  const q = useAsync<any>(() => get("accessRequests"), []);
  const [passwords,setPasswords] = useState<Record<string,string>>({});
  const [slugs,setSlugs] = useState<Record<string,string>>({});
  const [notes,setNotes] = useState<Record<string,string>>({});
  if(q.loading&&!q.data)return <Loading/>;
  if(q.error||!q.data)return <ErrorState message={q.error??"Failed"} retry={q.reload}/>;
  const run=async(id:string,status:"approved"|"rejected")=>{try{const r:any=await post({action:"reviewAccessRequest",id,status,temporaryPassword:passwords[id]??"",slug:slugs[id]??"",adminNote:notes[id]??""});toast(status==="approved"?`Workspace created: ${r.restaurantSlug}. Share the temporary password securely with the owner.`:"Request rejected");q.reload(true);}catch(e){toast(e instanceof Error?e.message:"Could not process request","err");}};
  if(!q.data.rows.length)return <Empty icon="✉️" title="No workspace requests" text="New restaurant access requests will appear here." />;
  return <div className="space-y-4">{q.data.rows.map((r:any)=><Card key={r.id} className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-display text-xl text-white">{r.restaurantName}</p><p className="text-sm text-neutral-400">{r.name} · {r.email}</p><p className="text-xs text-neutral-500">{r.phone} {r.city&&"· "+r.city} · {new Date(r.createdAt).toLocaleString()}</p></div><Badge tone={r.status==="pending"?"amber":r.status==="approved"?"green":"red"}>{r.status}</Badge></div>{r.message&&<p className="text-sm text-neutral-300">{r.message}</p>}{r.status==="pending"&&<div className="grid gap-3 sm:grid-cols-2"><Field label="Restaurant URL slug"><Input value={slugs[r.id]??r.restaurantName.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")} onChange={e=>setSlugs({...slugs,[r.id]:e.target.value})}/></Field><Field label="Temporary password (10+ chars)"><Input type="password" value={passwords[r.id]??""} onChange={e=>setPasswords({...passwords,[r.id]:e.target.value})}/></Field><Field label="Admin note"><Input value={notes[r.id]??""} onChange={e=>setNotes({...notes,[r.id]:e.target.value})}/></Field><div className="flex items-end gap-2"><Button variant="primary" disabled={(passwords[r.id]??"").length<10} onClick={()=>run(r.id,"approved")}>Approve & create workspace</Button><Button variant="danger" onClick={()=>run(r.id,"rejected")}>Reject</Button></div></div>}{r.status!=="pending"&&r.adminNote&&<p className="text-xs text-neutral-500">Admin note: {r.adminNote}</p>}</Card>)}</div>;
}
