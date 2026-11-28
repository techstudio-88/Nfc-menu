"use client";
import { useState } from "react";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import { Button, Card, Empty, ErrorState, Loading, PageHeader, useAsync, useToast } from "@/components/ui";

type Data = {
  items: { id: string; name: string }[];
  inventory: { id: string; name: string; unit: string; costPerUnit: number; active: boolean }[];
  recipes: { id: string; menuItemId: string; itemName: string; inventoryItemId: string; ingredientName: string; unit: string; quantityPerItem: number; costPerUnit: number }[];
};

export default function CostingPage() {
  const q = useAsync<Data>(() => api<Data>("/api/owner/recipes"), []);
  const toast = useToast();
  const [menuItemId, setMenuItemId] = useState("");
  const [inventoryItemId, setInventoryItemId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const qty = Number(quantity);
    if (!menuItemId || !inventoryItemId || !Number.isInteger(qty) || qty < 1) return toast("Choose a dish, ingredient and valid quantity.", "err");
    setBusy(true);
    try {
      await api("/api/owner/recipes", { body: { menuItemId, inventoryItemId, quantityPerItem: qty } });
      toast("Recipe ingredient saved");
      await q.reload(true);
    } catch (e) { toast(e instanceof Error ? e.message : "Could not save recipe", "err"); }
    finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    try { await api("/api/owner/recipes?id=" + id, { method: "DELETE" }); toast("Ingredient removed"); await q.reload(true); }
    catch (e) { toast(e instanceof Error ? e.message : "Could not remove ingredient", "err"); }
  };

  if (q.loading && !q.data) return <Loading />;
  if (q.error || !q.data) return <ErrorState message={q.error ?? "Could not load recipes"} retry={q.reload} />;
  const estimated = (itemId: string) => q.data!.recipes.filter(x => x.menuItemId === itemId).reduce((s,x) => s + x.quantityPerItem*x.costPerUnit,0);

  return <div className="space-y-6">
    <PageHeader title="Food costing & recipes" sub="Connect each menu dish to its ingredients. TapMenu snapshots recipe cost on new orders to calculate gross profit and margins." />
    <Card>
      <h2 className="font-display text-2xl text-ink">Add an ingredient to a dish</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-[1.3fr_1.3fr_.7fr_auto] md:items-end">
        <label className="block text-sm text-mute">Menu dish
          <select value={menuItemId} onChange={e=>setMenuItemId(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-3 text-ink">
            <option value="">Choose dish</option>{q.data.items.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
        </label>
        <label className="block text-sm text-mute">Ingredient
          <select value={inventoryItemId} onChange={e=>setInventoryItemId(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-3 text-ink">
            <option value="">Choose ingredient</option>{q.data.inventory.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name} · {formatMoney(x.costPerUnit)}</option>)}
          </select>
        </label>
        <label className="block text-sm text-mute">Quantity per dish
          <input value={quantity} onChange={e=>setQuantity(e.target.value)} inputMode="numeric" type="number" min="1" className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-3 text-ink" />
        </label>
        <Button busy={busy} onClick={save}>Save ingredient</Button>
      </div>
      <p className="mt-3 text-xs text-mute">Quantity uses the same unit configured for the ingredient in Inventory. Ingredient cost is stored in paise and multiplied by this quantity.</p>
    </Card>
    <Card>
      <h2 className="font-display text-2xl text-ink">Recipe cost by dish</h2>
      {!q.data.items.length ? <Empty icon="🍽️" title="No menu dishes yet" text="Add dishes in Menu Studio first." /> : (
        <div className="mt-4 divide-y divide-line">
          {q.data.items.map(item=>{
            const rows=q.data!.recipes.filter(x=>x.menuItemId===item.id);
            return <div key={item.id} className="py-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold text-ink">{item.name}</h3><span className="text-sm font-semibold text-brand">{rows.length?formatMoney(estimated(item.id)):"Add ingredients"}</span></div>
              {rows.length>0 ? <div className="mt-2 space-y-2">{rows.map(row=><div key={row.id} className="flex items-center justify-between gap-3 rounded-lg bg-porcelain px-3 py-2 text-sm"><span className="min-w-0 flex-1 truncate text-ink">{row.ingredientName} · {row.quantityPerItem} {row.unit}</span><span className="text-mute">{formatMoney(row.costPerUnit*row.quantityPerItem)}</span><button onClick={()=>void remove(row.id)} className="rounded-md px-2 py-1 text-signal hover:bg-signal-soft" aria-label={`Remove ${row.ingredientName}`}>Remove</button></div>)}</div> : <p className="mt-2 text-xs text-mute">No ingredients linked yet.</p>}
            </div>
          })}
        </div>
      )}
    </Card>
  </div>;
}
