/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useMemo, useState } from "react";
import { api } from "@/lib/client";
import { formatMoney } from "@/lib/pricing";
import { AssetUpload, crud, MoneyInput, Tabs, type Row } from "@/components/forms";
import { Badge, Button, Card, Empty, ErrorState, Field, Input, Loading, Modal, PageHeader, Select, Textarea, Toggle, useAsync, useToast } from "@/components/ui";

type Data = { cats: Row[]; items: Row[]; variants: Row[]; groups: Row[]; options: Row[]; links: Row[]; stations: Row[]; settings: Row; restaurant: Row };

const LAYERS = ["", "pepperoni", "mushroom", "olive", "onion", "pepper", "jalapeno", "corn", "basil", "cheese", "sauce_red", "sauce_white"];
const HH = /^\d{2}:\d{2}$/;

export default function MenuPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync<Data>(async () => {
    const [cats, items, variants, groups, options, links, stations, s] = await Promise.all([
      crud.list("categories"),
      crud.list("items"),
      crud.list("variants"),
      crud.list("groups"),
      crud.list("options"),
      crud.list("itemgroups"),
      crud.list("stations"),
      api<{ settings: Row; restaurant: Row }>("/api/owner/settings"),
    ]);
    return { cats, items, variants, groups, options, links, stations, settings: s.settings, restaurant: s.restaurant };
  }, []);
  const [cat, setCat] = useState<string>("all");
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [catModal, setCatModal] = useState<Row | "new" | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Failed to load"} retry={reload} />;
  const cur = data.settings.currency as string;
  const shown = data.items.filter((i) => cat === "all" || i.categoryId === cat);

  const toggleAvail = async (it: Row) => {
    await crud.update("items", it.id, { available: !it.available });
    toast(it.available ? "Marked unavailable — hidden from ordering" : "Back on the menu");
    reload(true);
  };
  const starter = async () => {
    setBusy(true);
    try {
      await api("/api/owner/settings", { body: { action: "starter-menu" } });
      toast("Starter menu loaded — including the build-your-own pizza");
      reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Menu"
        sub="Categories, dishes, sizes and the customisation engine."
        actions={
          <>
            <Button onClick={() => setGroupsOpen(true)}>⚙ Option groups</Button>
            <Button onClick={() => setCatModal("new")}>+ Category</Button>
            <Button variant="primary" disabled={!data.cats.length} onClick={() => setEditing("new")}>
              + Dish
            </Button>
          </>
        }
      />
      {data.cats.length === 0 ? (
        <Empty
          icon="🍕"
          title="Your menu is empty"
          text="Create your first category, or load a ready-made starter menu with a fully configured build-your-own pizza, burgers, pasta, drinks and desserts."
          action={
            <div className="flex gap-2">
              <Button variant="primary" busy={busy} onClick={starter}>
                Load starter menu
              </Button>
              <Button onClick={() => setCatModal("new")}>Create a category</Button>
            </div>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="space-y-1">
            {[{ id: "all", name: "All dishes" }, ...data.cats].map((c) => (
              <div key={c.id} className="group flex items-center">
                <button onClick={() => setCat(c.id)} className={`flex-1 rounded-xl px-3 py-2 text-left text-sm ${cat === c.id ? "bg-rose-500/15 text-rose-200" : "text-neutral-300 hover:bg-white/5"}`}>
                  {c.name}
                  {c.id !== "all" && !c.active && <span className="ml-2 text-xs text-neutral-500">hidden</span>}
                  <span className="float-right text-xs text-neutral-500">{c.id === "all" ? data.items.length : data.items.filter((i) => i.categoryId === c.id).length}</span>
                </button>
                {c.id !== "all" && (
                  <button aria-label={`Edit ${c.name}`} onClick={() => setCatModal(c)} className="px-2 text-neutral-500 opacity-0 hover:text-white focus:opacity-100 group-hover:opacity-100">
                    ✎
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {shown.length === 0 ? (
              <Empty icon="🍽️" title="No dishes here yet" action={<Button variant="primary" onClick={() => setEditing("new")}>Add a dish</Button>} />
            ) : (
              shown.map((it) => {
                const vs = data.variants.filter((v) => v.itemId === it.id);
                const gs = data.links.filter((l) => l.itemId === it.id);
                return (
                  <Card key={it.id} className="flex items-center gap-4 !p-3">
                    <div className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-emerald-50 text-2xl">
                      <span aria-hidden="true">🍽️</span>
                      {(it.imageAssetId || it.imageUrl) && /* eslint-disable-next-line @next/next/no-img-element */ <img src={it.imageAssetId ? `/api/assets/${it.imageAssetId}` : it.imageUrl} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="absolute inset-0 h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{it.name}</p>
                      <p className="text-xs text-neutral-400">
                        {formatMoney(it.basePrice, cur)} · {data.cats.find((c) => c.id === it.categoryId)?.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {vs.length > 0 && <Badge>{vs.length} sizes</Badge>}
                        {gs.length > 0 && <Badge tone="rose">{gs.length} option groups</Badge>}
                        {it.modelAssetId && <Badge tone="violet">custom 3D model</Badge>}
                        {it.featured && <Badge tone="blue">featured</Badge>}
                        {(it.availableFrom || it.availableTo) && <Badge>{it.availableFrom}–{it.availableTo}</Badge>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="hidden text-xs text-neutral-500 sm:block">{it.available ? "On menu" : "Sold out"}</span>
                      <Toggle checked={it.available} onChange={() => toggleAvail(it)} label={`${it.name} available`} />
                      <Button size="sm" onClick={() => setEditing(it)}>
                        Edit
                      </Button>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </div>
      )}

      {catModal && <CategoryModal row={catModal === "new" ? null : catModal} stations={data.stations} langs={data.restaurant.languages} onClose={() => setCatModal(null)} onSaved={() => { setCatModal(null); reload(true); }} />}
      {editing && <ItemEditor key={editing === "new" ? "new" : editing.id} initial={editing === "new" ? null : editing} data={data} onClose={() => setEditing(null)} reload={() => reload(true)} openGroups={() => setGroupsOpen(true)} />}
      {groupsOpen && <GroupLibrary data={data} onClose={() => { setGroupsOpen(false); reload(true); }} />}
    </div>
  );
}

/* ───────── category ───────── */
function CategoryModal({ row, stations, langs, onClose, onSaved }: { row: Row | null; stations: Row[]; langs: string[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [f, setF] = useState<Row>(row ?? { name: "", description: "", stationId: "", sort: 0, active: true, availableFrom: "", availableTo: "", translations: {} });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try {
      const body = { ...f, stationId: f.stationId || null, availableFrom: f.availableFrom || null, availableTo: f.availableTo || null };
      if (row) await crud.update("categories", row.id, body);
      else await crud.create("categories", body);
      toast("Category saved");
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
      setBusy(false);
    }
  };
  const del = async () => {
    if (!row || !confirm(`Delete “${row.name}” and ALL its dishes?`)) return;
    try {
      await crud.remove("categories", row.id);
      onSaved();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
    }
  };
  return (
    <Modal open onClose={onClose} title={row ? "Edit category" : "New category"}>
      <div className="space-y-4">
        <Field label="Name">
          <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
        </Field>
        <Field label="Description">
          <Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default kitchen station" hint="Dishes route here unless overridden">
            <Select value={f.stationId ?? ""} onChange={(e) => setF({ ...f, stationId: e.target.value })}>
              <option value="">First station</option>
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Sort order">
            <Input type="number" value={f.sort} onChange={(e) => setF({ ...f, sort: Number(e.target.value) })} />
          </Field>
          <Field label="Available from" hint="Leave empty for all day">
            <Input type="time" value={f.availableFrom ?? ""} onChange={(e) => setF({ ...f, availableFrom: e.target.value })} />
          </Field>
          <Field label="Available until">
            <Input type="time" value={f.availableTo ?? ""} onChange={(e) => setF({ ...f, availableTo: e.target.value })} />
          </Field>
        </div>
        {langs.filter((l) => l !== "en").map((l) => (
          <Field key={l} label={`Name (${l})`}>
            <Input value={f.translations?.[l]?.name ?? ""} onChange={(e) => setF({ ...f, translations: { ...f.translations, [l]: { ...f.translations?.[l], name: e.target.value } } })} />
          </Field>
        ))}
        <div className="flex items-center gap-3">
          <Toggle checked={f.active} onChange={(v) => setF({ ...f, active: v })} label="Visible" />
          <span className="text-sm text-neutral-300">Visible to customers</span>
        </div>
        <div className="flex justify-between pt-2">
          {row ? <Button variant="danger" onClick={del}>Delete</Button> : <span />}
          <Button variant="primary" busy={busy} onClick={save}>
            Save category
          </Button>
        </div>
      </div>
    </Modal>
  );
}

/* ───────── item editor ───────── */
function ItemEditor({ initial, data, onClose, reload, openGroups }: { initial: Row | null; data: Data; onClose: () => void; reload: () => void; openGroups: () => void }) {
  const toast = useToast();
  const [item, setItem] = useState<Row | null>(initial);
  const [tab, setTab] = useState<"details" | "sizes" | "custom" | "i18n">("details");
  const [f, setF] = useState<Row>(
    initial
      ? { ...initial, ingredientsText: (initial.ingredients ?? []).join(", ") }
      : { name: "", description: "", categoryId: data.cats[0]?.id, basePrice: 0, stationId: "", visual: "generic", available: true, featured: false, prepMinutes: 10, availableFrom: "", availableTo: "", imageAssetId: null, imageUrl: null, modelAssetId: null, translations: {}, ingredientsText: "" },
  );
  const [busy, setBusy] = useState(false);
  const [variants, setVariants] = useState<Row[]>(() => (initial ? data.variants.filter((v) => v.itemId === initial.id) : []));
  const [links, setLinks] = useState<Row[]>(() => (initial ? data.links.filter((l) => l.itemId === initial.id) : []));
  const langs: string[] = data.restaurant.languages;
  const cur = data.settings.currency as string;

  const save = async () => {
    setBusy(true);
    try {
      const body = {
        name: f.name,
        description: f.description,
        categoryId: f.categoryId,
        basePrice: f.basePrice,
        stationId: f.stationId || null,
        visual: f.visual,
        available: f.available,
        featured: f.featured,
        prepMinutes: Number(f.prepMinutes) || 10,
        availableFrom: HH.test(f.availableFrom ?? "") ? f.availableFrom : null,
        availableTo: HH.test(f.availableTo ?? "") ? f.availableTo : null,
        imageAssetId: f.imageAssetId ?? null,
        imageUrl: f.imageAssetId ? null : f.imageUrl || null,
        modelAssetId: f.modelAssetId ?? null,
        translations: f.translations ?? {},
        ingredients: String(f.ingredientsText ?? "").split(",").map((s) => s.trim()).filter(Boolean),
      };
      const r = item ? await crud.update("items", item.id, body) : await crud.create("items", body);
      setItem(r);
      toast("Dish saved");
      reload();
      if (!item) setTab("sizes");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
    } finally {
      setBusy(false);
    }
  };
  const del = async () => {
    if (!item || !confirm(`Delete “${item.name}”? Past orders keep their history.`)) return;
    await crud.remove("items", item.id);
    reload();
    onClose();
  };

  const addVariant = async () => {
    if (!item) return;
    const v = await crud.create("variants", { itemId: item.id, name: variants.length ? "Large" : "Regular", priceDelta: 0, isDefault: !variants.length, sort: variants.length });
    setVariants([...variants, v]);
    reload();
  };
  const patchVariant = async (v: Row, patch: Row) => {
    setVariants((s) => s.map((x) => (x.id === v.id ? { ...x, ...patch } : x)));
    try {
      await crud.update("variants", v.id, patch);
      if (patch.isDefault) {
        for (const o of variants.filter((x) => x.id !== v.id && x.isDefault)) await crud.update("variants", o.id, { isDefault: false });
        setVariants((s) => s.map((x) => ({ ...x, isDefault: x.id === v.id })));
      }
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed", "err");
    }
  };
  const attach = async (g: Row) => {
    if (!item) return;
    const l = links.find((x) => x.groupId === g.id);
    if (l) {
      await crud.remove("itemgroups", l.id);
      setLinks(links.filter((x) => x.id !== l.id));
    } else {
      const n = await crud.create("itemgroups", { itemId: item.id, groupId: g.id, sort: links.length });
      setLinks([...links, n]);
    }
    reload();
  };

  return (
    <Modal open onClose={onClose} title={item ? `Edit · ${item.name}` : "New dish"} wide>
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "details", label: "Details" },
          { id: "sizes", label: `Sizes${variants.length ? ` (${variants.length})` : ""}`, disabled: !item },
          { id: "custom", label: `Customisation${links.length ? ` (${links.length})` : ""}`, disabled: !item },
          { id: "i18n", label: "Translations", disabled: langs.length < 2 },
        ]}
      />
      {tab === "details" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus />
            </Field>
            <Field label="Category">
              <Select value={f.categoryId} onChange={(e) => setF({ ...f, categoryId: e.target.value })}>
                {data.cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={`Base price (${cur})`}>
              <MoneyInput value={f.basePrice} onChange={(v) => setF({ ...f, basePrice: v })} />
            </Field>
            <Field label="Kitchen station" hint="Overrides the category default">
              <Select value={f.stationId ?? ""} onChange={(e) => setF({ ...f, stationId: e.target.value })}>
                <option value="">Use category default</option>
                {data.stations.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Description">
            <Textarea value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
          </Field>
          <Field label="Ingredients" hint="Comma separated — shown to customers and animated in the dish sheet">
            <Input value={f.ingredientsText} onChange={(e) => setF({ ...f, ingredientsText: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="3D preview style" hint="Procedural 3D model used when no custom model is uploaded">
              <Select value={f.visual} onChange={(e) => setF({ ...f, visual: e.target.value })}>
                {["generic", "pizza", "burger", "pasta", "drink", "dessert"].map((v) => (
                  <option key={v}>{v}</option>
                ))}
              </Select>
            </Field>
            <Field label="Prep time (minutes)">
              <Input type="number" min={1} value={f.prepMinutes} onChange={(e) => setF({ ...f, prepMinutes: e.target.value })} />
            </Field>
            <Field label="Available from" hint="Schedule — empty = all day">
              <Input type="time" value={f.availableFrom ?? ""} onChange={(e) => setF({ ...f, availableFrom: e.target.value })} />
            </Field>
            <Field label="Available until">
              <Input type="time" value={f.availableTo ?? ""} onChange={(e) => setF({ ...f, availableTo: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <AssetUpload kind="image" label="Dish photo" assetId={f.imageAssetId} url={f.imageUrl} onChange={(id) => setF({ ...f, imageAssetId: id, imageUrl: id ? null : null })} />
            <AssetUpload kind="model" label="3D model (GLB) — enables AR" assetId={f.modelAssetId} onChange={(id) => setF({ ...f, modelAssetId: id })} />
          </div>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <Toggle checked={f.available} onChange={(v) => setF({ ...f, available: v })} label="Available" /> Available now
            </label>
            <label className="flex items-center gap-3 text-sm text-neutral-300">
              <Toggle checked={f.featured} onChange={(v) => setF({ ...f, featured: v })} label="Featured" /> Chef’s pick
            </label>
          </div>
          <div className="flex justify-between pt-2">
            {item ? <Button variant="danger" onClick={del}>Delete dish</Button> : <span />}
            <Button variant="primary" busy={busy} onClick={save} disabled={!f.name}>
              {item ? "Save changes" : "Create dish"}
            </Button>
          </div>
        </div>
      )}
      {tab === "sizes" && item && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">Sizes add a price on top of the base price ({formatMoney(f.basePrice, cur)}). Option prices can differ per size. Leave empty for dishes with a single size.</p>
          {variants.map((v) => (
            <div key={v.id} className="grid grid-cols-[1fr_120px_auto_auto] items-center gap-2">
              <Input defaultValue={v.name} onBlur={(e) => e.target.value !== v.name && patchVariant(v, { name: e.target.value })} aria-label="Size name" />
              <MoneyInput value={v.priceDelta} onChange={(c) => patchVariant(v, { priceDelta: c })} aria-label="Price adjustment" />
              <label className="flex items-center gap-2 text-xs text-neutral-300">
                <Toggle checked={v.isDefault} onChange={() => patchVariant(v, { isDefault: true })} label="Default" /> default
              </label>
              <Button size="sm" variant="danger" onClick={async () => { await crud.remove("variants", v.id); setVariants(variants.filter((x) => x.id !== v.id)); reload(); }}>
                ✕
              </Button>
            </div>
          ))}
          <Button onClick={addVariant}>+ Add size</Button>
        </div>
      )}
      {tab === "custom" && item && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">Attach reusable option groups — crusts, toppings, add-ons, removable ingredients, spice levels. They’re shared across dishes.</p>
          {data.groups.length === 0 && <Empty title="No option groups yet" action={<Button variant="primary" onClick={openGroups}>Create option groups</Button>} />}
          {data.groups.map((g) => {
            const on = links.some((l) => l.groupId === g.id);
            return (
              <label key={g.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${on ? "border-rose-500/40 bg-rose-500/5" : "border-white/10"}`}>
                <input type="checkbox" checked={on} onChange={() => attach(g)} className="h-4 w-4 accent-rose-500" />
                <span className="flex-1">
                  <span className="text-sm text-white">{g.name}</span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {g.kind} · {data.options.filter((o) => o.groupId === g.id).length} options · {g.minSelect > 0 ? "required" : "optional"}
                    {g.rule && (g.rule.variantNames?.length || g.rule.whenOptionIds?.length) ? " · conditional" : ""}
                  </span>
                </span>
              </label>
            );
          })}
          <Button onClick={openGroups}>⚙ Manage option groups</Button>
        </div>
      )}
      {tab === "i18n" && (
        <div className="space-y-4">
          {langs.filter((l) => l !== "en").map((l) => (
            <div key={l} className="space-y-2 rounded-xl border border-white/10 p-3">
              <p className="text-xs uppercase tracking-wider text-neutral-400">{l}</p>
              <Input placeholder="Name" value={f.translations?.[l]?.name ?? ""} onChange={(e) => setF({ ...f, translations: { ...f.translations, [l]: { ...f.translations?.[l], name: e.target.value } } })} />
              <Textarea placeholder="Description" value={f.translations?.[l]?.description ?? ""} onChange={(e) => setF({ ...f, translations: { ...f.translations, [l]: { ...f.translations?.[l], description: e.target.value } } })} />
            </div>
          ))}
          <Button variant="primary" busy={busy} onClick={save}>
            Save translations
          </Button>
        </div>
      )}
    </Modal>
  );
}

/* ───────── option group library ───────── */
function GroupLibrary({ data, onClose }: { data: Data; onClose: () => void }) {
  const toast = useToast();
  const [groups, setGroups] = useState<Row[]>(data.groups);
  const [options, setOptions] = useState<Row[]>(data.options);
  const [sel, setSel] = useState<string | null>(data.groups[0]?.id ?? null);
  const cur = data.settings.currency as string;
  const sizes = useMemo(() => [...new Set(data.variants.map((v) => String(v.name).trim().toLowerCase()))], [data.variants]);
  const g = groups.find((x) => x.id === sel);
  const opts = options.filter((o) => o.groupId === sel);
  const fail = (e: unknown) => toast(e instanceof Error ? e.message : "Failed", "err");

  const newGroup = async () => {
    try {
      const r = await crud.create("groups", { name: "New group", kind: "add", minSelect: 0, maxSelect: 3, allowQuantity: false, maxQty: 1, sort: groups.length });
      setGroups([...groups, r]);
      setSel(r.id);
    } catch (e) {
      fail(e);
    }
  };
  const patchGroup = async (patch: Row) => {
    if (!g) return;
    setGroups((s) => s.map((x) => (x.id === g.id ? { ...x, ...patch } : x)));
    try {
      await crud.update("groups", g.id, patch);
    } catch (e) {
      fail(e);
    }
  };
  const addOption = async () => {
    if (!g) return;
    try {
      const r = await crud.create("options", { groupId: g.id, name: "New option", price: 0, sort: opts.length, available: true });
      setOptions([...options, r]);
    } catch (e) {
      fail(e);
    }
  };
  const patchOption = async (o: Row, patch: Row) => {
    setOptions((s) => s.map((x) => (x.id === o.id ? { ...x, ...patch } : x)));
    try {
      await crud.update("options", o.id, patch);
    } catch (e) {
      fail(e);
    }
  };
  const others = options.filter((o) => o.groupId !== sel);
  const whenId = g?.rule?.whenOptionIds?.[0] ?? "";

  return (
    <Modal open onClose={onClose} title="Option groups" wide>
      <div className="grid gap-5 md:grid-cols-[200px_1fr]">
        <div className="space-y-1">
          {groups.map((x) => (
            <button key={x.id} onClick={() => setSel(x.id)} className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${sel === x.id ? "bg-rose-500/15 text-rose-200" : "text-neutral-300 hover:bg-white/5"}`}>
              {x.name}
              <span className="block text-[11px] text-neutral-500">
                {x.kind} · {options.filter((o) => o.groupId === x.id).length} options
              </span>
            </button>
          ))}
          <Button size="sm" onClick={newGroup} className="w-full">
            + New group
          </Button>
        </div>
        {!g ? (
          <Empty title="Create a group" text="Groups hold options like crust types, toppings or spice levels." />
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Group name">
                <Input defaultValue={g.name} key={g.id} onBlur={(e) => e.target.value !== g.name && patchGroup({ name: e.target.value })} />
              </Field>
              <Field label="Type" hint="choice = pick (crust, size…), add = extras with prices, remove = take out an ingredient">
                <Select value={g.kind} onChange={(e) => patchGroup({ kind: e.target.value })}>
                  <option value="choice">Choice (single pick)</option>
                  <option value="add">Add-ons / toppings</option>
                  <option value="remove">Removable ingredients</option>
                </Select>
              </Field>
              <Field label="Minimum selections" hint="1+ makes the group required">
                <Input type="number" min={0} value={g.minSelect} onChange={(e) => patchGroup({ minSelect: Number(e.target.value) })} />
              </Field>
              <Field label="Maximum selections">
                <Input type="number" min={1} value={g.maxSelect} onChange={(e) => patchGroup({ maxSelect: Number(e.target.value) })} />
              </Field>
              <label className="flex items-center gap-3 text-sm text-neutral-300">
                <Toggle checked={g.allowQuantity} onChange={(v) => patchGroup({ allowQuantity: v, maxQty: v ? Math.max(2, g.maxQty) : 1 })} label="Allow quantities" /> Allow extra quantities
              </label>
              {g.allowQuantity && (
                <Field label="Max quantity per option">
                  <Input type="number" min={1} value={g.maxQty} onChange={(e) => patchGroup({ maxQty: Number(e.target.value) })} />
                </Field>
              )}
            </div>
            <div className="rounded-xl border border-white/10 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">Conditional rule (optional)</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Only for sizes" hint={`Comma separated, e.g. ${sizes.slice(0, 2).join(", ") || "large"}`}>
                  <Input key={g.id + "v"} defaultValue={(g.rule?.variantNames ?? []).join(", ")} onBlur={(e) => patchGroup({ rule: { ...g.rule, variantNames: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })} />
                </Field>
                <Field label="Only when option selected">
                  <Select value={whenId} onChange={(e) => patchGroup({ rule: { ...g.rule, whenOptionIds: e.target.value ? [e.target.value] : [] } })}>
                    <option value="">Always show</option>
                    {others.map((o) => (
                      <option key={o.id} value={o.id}>
                        {groups.find((x) => x.id === o.groupId)?.name} → {o.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">Options</p>
                <Button size="sm" onClick={addOption}>
                  + Option
                </Button>
              </div>
              {opts.length === 0 && <p className="text-sm text-neutral-500">No options yet.</p>}
              {opts.map((o) => (
                <div key={o.id} className="space-y-2 rounded-xl border border-white/10 p-3">
                  <div className="grid grid-cols-[1fr_110px_auto] items-center gap-2">
                    <Input defaultValue={o.name} onBlur={(e) => e.target.value !== o.name && patchOption(o, { name: e.target.value })} aria-label="Option name" />
                    <MoneyInput value={o.price} onChange={(c) => patchOption(o, { price: c })} aria-label={`Price (${cur})`} title={`Base price (${cur})`} />
                    <Button size="sm" variant="danger" onClick={async () => { await crud.remove("options", o.id); setOptions(options.filter((x) => x.id !== o.id)); }}>
                      ✕
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    <label className="flex items-center gap-2">
                      <Toggle checked={o.available} onChange={(v) => patchOption(o, { available: v })} label="Available" /> in stock
                    </label>
                    <label className="flex items-center gap-2">
                      <Toggle checked={o.isDefault} onChange={(v) => patchOption(o, { isDefault: v })} label="Default" /> preselected
                    </label>
                    <label className="flex items-center gap-2">
                      3D layer
                      <Select className="!w-auto !py-1 text-xs" value={o.layer ?? ""} onChange={(e) => patchOption(o, { layer: e.target.value || null })}>
                        {LAYERS.map((l) => (
                          <option key={l} value={l}>
                            {l || "none"}
                          </option>
                        ))}
                      </Select>
                    </label>
                  </div>
                  {sizes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                      <span>Price by size:</span>
                      {sizes.map((s) => (
                        <label key={s} className="flex items-center gap-1">
                          <span className="capitalize">{s}</span>
                          <MoneyInput
                            className="!w-20 !py-1 text-xs"
                            value={o.priceBySize?.[s] ?? o.price}
                            onChange={(c) => {
                              const next = { ...(o.priceBySize ?? {}), [s]: c };
                              patchOption(o, { priceBySize: next });
                            }}
                          />
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between">
              <Button variant="danger" onClick={async () => { if (!confirm(`Delete group “${g.name}”?`)) return; try { await crud.remove("groups", g.id); const rest = groups.filter((x) => x.id !== g.id); setGroups(rest); setSel(rest[0]?.id ?? null); } catch (e) { fail(e); } }}>
                Delete group
              </Button>
              <Button variant="primary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
