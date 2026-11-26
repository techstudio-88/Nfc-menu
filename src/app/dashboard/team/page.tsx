/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { crud, Tabs, type Row } from "@/components/forms";
import { Badge, Button, Card, Empty, ErrorState, Field, Input, Loading, Modal, PageHeader, Select, Toggle, useAsync, useToast } from "@/components/ui";

export default function Team() {
  const toast = useToast();
  const t = useAsync<{ rows: Row[] }>(() => api("/api/owner/team"), []);
  const st = useAsync<Row[]>(() => crud.list("stations"), []);
  const [tab, setTab] = useState<"staff" | "stations">("staff");
  const [add, setAdd] = useState(false);
  const [pw, setPw] = useState<Row | null>(null);
  const fail = (e: unknown) => toast(e instanceof Error ? e.message : "Failed", "err");
  const patch = (id: string, body: Row) => api(`/api/owner/team?id=${id}`, { method: "PATCH", body }).then(() => t.reload(true)).catch(fail);

  if ((t.loading && !t.data) || (st.loading && !st.data)) return <Loading />;
  if (t.error || !t.data) return <ErrorState message={t.error ?? "Failed"} retry={t.reload} />;
  const stations = st.data ?? [];

  return (
    <div>
      <PageHeader title="Team & kitchen" sub="Employees sign in with their own account and only see what their role needs." actions={<Button variant="primary" onClick={() => setAdd(true)}>+ Add employee</Button>} />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "staff", label: `Employees (${t.data.rows.length})` }, { id: "stations", label: `Kitchen stations (${stations.length})` }]} />
      {tab === "staff" && (
        <div className="space-y-3">
          {t.data.rows.map((m) => (
            <Card key={m.userId} className="grid items-center gap-3 !p-4 md:grid-cols-[1.2fr_150px_150px_auto_auto]">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{m.name}</p>
                <p className="truncate text-xs text-neutral-400">{m.email}</p>
              </div>
              {m.role === "owner" ? (
                <Badge tone="amber">owner</Badge>
              ) : (
                <Select aria-label="Role" value={m.role} onChange={(e) => patch(m.userId, { role: e.target.value })}>
                  <option value="manager">Manager</option>
                  <option value="kitchen">Kitchen</option>
                  <option value="waiter">Waiter</option>
                </Select>
              )}
              {m.role === "kitchen" ? (
                <Select aria-label="Station" value={m.stationId ?? ""} onChange={(e) => patch(m.userId, { stationId: e.target.value })}>
                  <option value="">All stations</option>
                  {stations.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              ) : <span />}
              {m.role !== "owner" && (
                <div className="flex items-center gap-4 text-xs text-neutral-400">
                  <label className="flex items-center gap-2"><Toggle checked={m.active} onChange={(v) => patch(m.userId, { active: v })} label="Active" /> active</label>
                  {m.employeeId && <label className="flex items-center gap-2"><Toggle checked={!!m.onDuty} onChange={(v) => patch(m.userId, { onDuty: v })} label="On duty" /> on duty</label>}
                </div>
              )}
              {m.role !== "owner" && (
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setPw(m)}>Reset password</Button>
                  <Button size="sm" variant="danger" onClick={async () => { if (confirm(`Remove ${m.name}? Their login will stop working.`)) { try { await api(`/api/owner/team?id=${m.userId}`, { method: "DELETE" }); t.reload(true); } catch (e) { fail(e); } } }}>✕</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {tab === "stations" && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">Dishes are routed to a station by dish → category → first station. A single order keeps one status while each station tracks its own progress on the kitchen display.</p>
          {stations.length === 0 && <Empty title="No stations" />}
          {stations.map((s) => (
            <Card key={s.id} className="flex items-center gap-3 !p-3">
              <Input defaultValue={s.name} aria-label="Station name" onBlur={(e) => e.target.value !== s.name && crud.update("stations", s.id, { name: e.target.value }).then(() => st.reload(true)).catch(fail)} />
              <Input type="number" className="!w-24" defaultValue={s.sort} aria-label="Sort" onBlur={(e) => crud.update("stations", s.id, { sort: Number(e.target.value) }).catch(fail)} />
              <Toggle checked={s.active} onChange={(v) => crud.update("stations", s.id, { active: v }).then(() => st.reload(true)).catch(fail)} label="Active" />
              <Button size="sm" variant="danger" onClick={async () => { if (confirm(`Delete station “${s.name}”?`)) { try { await crud.remove("stations", s.id); st.reload(true); } catch (e) { fail(e); } } }}>✕</Button>
            </Card>
          ))}
          <Button onClick={() => { const name = prompt("Station name (e.g. Grill, Salads)"); if (name) crud.create("stations", { name, sort: stations.length + 1 }).then(() => st.reload(true)).catch(fail); }}>+ Add station</Button>
        </div>
      )}
      {add && <AddStaff onClose={() => setAdd(false)} onDone={() => { setAdd(false); t.reload(true); }} />}
      {pw && <ResetPw m={pw} onClose={() => setPw(null)} />}
    </div>
  );
}

function AddStaff({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [f, setF] = useState({ name: "", email: "", password: "", role: "waiter" });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try {
      await api("/api/owner/team", { body: f });
      toast("Employee created — share their login securely");
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="Add employee">
      <div className="space-y-4">
        <Field label="Full name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus /></Field>
        <Field label="Email (their login)"><Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Temporary password" hint="At least 8 characters"><Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></Field>
        <Field label="Role" hint="Kitchen → kitchen display · Waiter → floor panel · Manager → full dashboard">
          <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option value="waiter">Waiter</option><option value="kitchen">Kitchen</option><option value="manager">Manager</option></Select>
        </Field>
        <Button variant="primary" className="w-full" busy={busy} onClick={go}>Create employee</Button>
      </div>
    </Modal>
  );
}

function ResetPw({ m, onClose }: { m: Row; onClose: () => void }) {
  const toast = useToast();
  const [pw, setPw] = useState("");
  return (
    <Modal open onClose={onClose} title={`Reset password · ${m.name}`}>
      <Field label="New password"><Input value={pw} onChange={(e) => setPw(e.target.value)} autoFocus /></Field>
      <Button variant="primary" className="mt-4 w-full" onClick={async () => { try { await api(`/api/owner/team?id=${m.userId}`, { method: "PATCH", body: { password: pw } }); toast("Password updated"); onClose(); } catch (e) { toast(e instanceof Error ? e.message : "Failed", "err"); } }}>Update password</Button>
    </Modal>
  );
}
