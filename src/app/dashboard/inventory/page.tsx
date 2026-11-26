"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { Badge, Button, Card, Empty, ErrorState, Field, Input, Loading, Modal, PageHeader, Stat, useAsync, useToast } from "@/components/ui";

type StockItem = { id: string; name: string; unit: string; stock: number; lowStockAt: number; costPerUnit: number; active: boolean };
const load = () => api<{ rows: StockItem[] }>("/api/owner/inventory");
const blank = { name: "", unit: "pcs", stock: 0, lowStockAt: 5, costPerUnit: 0, active: true };

export default function InventoryPage() {
  const q = useAsync(load, []);
  const toast = useToast();
  const [edit, setEdit] = useState<Partial<StockItem> | null>(null);
  const [adjust, setAdjust] = useState<{ id: string; delta: string } | null>(null);
  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Could not load inventory"} retry={q.reload} />;
  const rows = q.data.rows;
  const low = rows.filter((x) => x.active && x.stock <= x.lowStockAt).length;
  const value = rows.reduce((sum, x) => sum + x.stock * x.costPerUnit, 0);
  const save = async () => {
    if (!edit?.name?.trim()) return;
    try {
      if (edit.id) await api("/api/owner/inventory?id=" + edit.id, { method: "PATCH", body: edit });
      else await api("/api/owner/inventory", { body: edit });
      toast("Inventory saved"); setEdit(null); q.reload(true);
    } catch (e) { toast(e instanceof Error ? e.message : "Save failed", "err"); }
  };
  const change = async () => {
    if (!adjust) return;
    const item = rows.find((x) => x.id === adjust.id);
    if (!item) return;
    const next = item.stock + Number(adjust.delta);
    if (!Number.isInteger(next) || next < 0) { toast("Stock cannot be negative", "err"); return; }
    try {
      await api("/api/owner/inventory?id=" + item.id, { method: "PATCH", body: { stock: next } });
      toast("Stock updated"); setAdjust(null); q.reload(true);
    } catch (e) { toast(e instanceof Error ? e.message : "Update failed", "err"); }
  };
  return <div className="space-y-6">
    <PageHeader title="Inventory & stock" sub="Track ingredients and supplies, spot low stock early and keep your kitchen ready." actions={<Button variant="primary" onClick={() => setEdit({ ...blank })}>＋ Add stock item</Button>} />
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Stock items" value={rows.filter((x) => x.active).length} sub="Active inventory" />
      <Stat label="Low-stock alerts" value={low} sub="At or below reorder level" accent />
      <Stat label="Estimated stock value" value={"₹" + (value / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })} sub="Based on cost per unit" />
    </div>
    {low > 0 && <Card><p className="flex items-center gap-2 text-sm font-semibold text-rose-200">⚠ {low} items need attention</p><p className="mt-1 text-xs text-white/45">Review highlighted items and restock before service.</p></Card>}
    {rows.length === 0 ? <Empty icon="📦" title="Your stock room is ready" text="Add your first ingredient or supply to start tracking stock." action={<Button variant="primary" onClick={() => setEdit({ ...blank })}>Add first item</Button>} /> :
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((item) => <Card key={item.id} className="space-y-4">
        <div className="flex items-start justify-between gap-2"><div className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-rose-400/15 bg-rose-500/10 text-xl">📦</span><div><h3 className="font-semibold text-white">{item.name}</h3><p className="text-xs text-neutral-500">Cost / unit: ₹{(item.costPerUnit / 100).toFixed(2)}</p></div></div><Badge tone={item.stock <= item.lowStockAt ? "red" : "green"}>{item.stock <= item.lowStockAt ? "Low stock" : "In stock"}</Badge></div>
        <div className="flex items-end justify-between"><div><p className="text-[10px] uppercase tracking-wider text-neutral-500">Available quantity</p><p className="mt-1 font-display text-4xl text-white">{item.stock}<span className="ml-2 text-sm text-neutral-500">{item.unit}</span></p></div><p className="text-right text-xs text-neutral-500">Reorder at<br/><b className="text-rose-200">{item.lowStockAt} {item.unit}</b></p></div>
        <div className="flex gap-2"><Button size="sm" variant="primary" className="flex-1" onClick={() => setAdjust({ id: item.id, delta: "1" })}>＋ Adjust stock</Button><Button size="sm" onClick={() => setEdit({ ...item })}>Edit</Button></div>
      </Card>)}</div>}
    {edit && <Modal open onClose={() => setEdit(null)} title={edit.id ? "Edit stock item" : "Add stock item"}><div className="grid gap-3 sm:grid-cols-2">
      <Field label="Item name"><Input value={edit.name ?? ""} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></Field>
      <Field label="Unit"><Input value={edit.unit ?? "pcs"} onChange={(e) => setEdit({ ...edit, unit: e.target.value })} /></Field>
      <Field label="Current stock"><Input type="number" min="0" value={edit.stock ?? 0} onChange={(e) => setEdit({ ...edit, stock: Number(e.target.value) })} /></Field>
      <Field label="Low-stock alert at"><Input type="number" min="0" value={edit.lowStockAt ?? 5} onChange={(e) => setEdit({ ...edit, lowStockAt: Number(e.target.value) })} /></Field>
      <Field label="Cost per unit (paise)"><Input type="number" min="0" value={edit.costPerUnit ?? 0} onChange={(e) => setEdit({ ...edit, costPerUnit: Number(e.target.value) })} /></Field>
    </div><Button variant="primary" className="mt-5 w-full" onClick={save}>Save inventory item</Button></Modal>}
    {adjust && <Modal open onClose={() => setAdjust(null)} title="Adjust stock"><Field label="Quantity change (+ or -)"><Input type="number" value={adjust.delta} onChange={(e) => setAdjust({ ...adjust, delta: e.target.value })} /></Field><p className="mt-2 text-xs text-neutral-500">Positive for received stock; negative for consumed or wasted stock.</p><Button variant="primary" className="mt-5 w-full" onClick={change}>Apply adjustment</Button></Modal>}
  </div>;
}
