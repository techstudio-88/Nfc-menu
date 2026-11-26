/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { crud, Tabs, type Row } from "@/components/forms";
import { Badge, Button, Card, Empty, ErrorState, Field, Input, Loading, Modal, PageHeader, Select, Toggle, useAsync, useToast } from "@/components/ui";

type D = { branches: Row[]; tables: Row[]; cards: Row[]; settings: Row; restaurant: Row; usage: Row; plan: Row | null };

export default function Venues() {
  const toast = useToast();
  const { data, error, loading, reload } = useAsync<D>(async () => {
    const [branches, tables, cards, s] = await Promise.all([crud.list("branches"), crud.list("tables"), crud.list("cards"), api<any>("/api/owner/settings")]);
    return { branches, tables, cards, settings: s.settings, restaurant: s.restaurant, usage: s.usage, plan: s.plan };
  }, []);
  const [tab, setTab] = useState<"tables" | "nfc" | "branches">("tables");
  const [bulk, setBulk] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [qr, setQr] = useState<Row | null>(null);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? "Failed"} retry={reload} />;
  const fail = (e: unknown) => toast(e instanceof Error ? e.message : "Failed", "err");
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const url = (c: Row) => {
    const t = data.tables.find((x) => x.id === c.tableId);
    return `${origin}/r/${data.restaurant.slug}?${t ? `table=${t.code}&` : ""}c=${c.token}`;
  };
  const tableUrl = (code: string) => `${origin}/r/${data.restaurant.slug}?table=${code}`;

  const addBranch = async () => {
    const name = prompt("Branch name");
    if (!name) return;
    try {
      await crud.create("branches", { name });
      reload(true);
    } catch (e) {
      fail(e);
    }
  };
  const makeCards = async () => {
    const without = data.tables.filter((t) => !data.cards.some((c) => c.tableId === t.id));
    if (!without.length) return toast("Every table already has a card", "info");
    try {
      for (const t of without) await crud.create("cards", { tableId: t.id, label: `Card ${t.code}` });
      toast(`Generated ${without.length} NFC cards`);
      reload(true);
    } catch (e) {
      fail(e);
      reload(true);
    }
  };

  return (
    <div>
      <PageHeader
        title="Tables & NFC"
        sub={`Plan: ${data.plan?.name ?? "—"} · ${data.usage.tables}/${data.plan?.maxTables ?? "∞"} tables · ${data.usage.branches}/${data.plan?.maxBranches ?? "∞"} branches`}
        actions={
          <>
            <Button onClick={() => setBulk(true)} disabled={!data.branches.length}>+ Add tables</Button>
            <Button onClick={makeCards} disabled={!data.tables.length}>⚡ Generate NFC cards</Button>
            <Button variant="primary" onClick={() => setPrinting(true)} disabled={!data.cards.length}>🖨 Print cards</Button>
          </>
        }
      />
      <Tabs value={tab} onChange={setTab} tabs={[{ id: "tables", label: `Tables (${data.tables.length})` }, { id: "nfc", label: `NFC cards (${data.cards.length})` }, { id: "branches", label: `Branches (${data.branches.length})` }]} />

      {tab === "branches" && (
        <div className="space-y-3">
          {data.branches.map((b) => (
            <Card key={b.id} className="grid items-center gap-3 sm:grid-cols-[1fr_1fr_1fr_auto_auto]">
              <Input defaultValue={b.name} aria-label="Branch name" onBlur={(e) => e.target.value !== b.name && crud.update("branches", b.id, { name: e.target.value }).then(() => reload(true)).catch(fail)} />
              <Input defaultValue={b.address} placeholder="Address" aria-label="Address" onBlur={(e) => crud.update("branches", b.id, { address: e.target.value }).catch(fail)} />
              <Input defaultValue={b.phone} placeholder="Phone" aria-label="Phone" onBlur={(e) => crud.update("branches", b.id, { phone: e.target.value }).catch(fail)} />
              <Toggle checked={b.active} onChange={(v) => crud.update("branches", b.id, { active: v }).then(() => reload(true)).catch(fail)} label="Active" />
              <Button size="sm" variant="danger" onClick={async () => { if (confirm(`Delete branch “${b.name}” and its tables?`)) { try { await crud.remove("branches", b.id); reload(true); } catch (e) { fail(e); } } }}>✕</Button>
            </Card>
          ))}
          <Button onClick={addBranch}>+ Add branch</Button>
        </div>
      )}

      {tab === "tables" &&
        (data.tables.length === 0 ? (
          <Empty icon="📍" title="No tables yet" text="Add tables, then generate an NFC card for each one." action={<Button variant="primary" onClick={() => setBulk(true)}>Add tables</Button>} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.tables.map((t) => {
              const cards = data.cards.filter((c) => c.tableId === t.id);
              return (
                <Card key={t.id} className="!p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-2xl text-white">{t.code}</p>
                    <Toggle checked={t.active} onChange={(v) => crud.update("tables", t.id, { active: v }).then(() => reload(true)).catch(fail)} label={`Table ${t.code} active`} />
                  </div>
                  <p className="text-xs text-neutral-400">{data.branches.find((b) => b.id === t.branchId)?.name} · {t.seats} seats</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge tone={cards.length ? "green" : "neutral"}>{cards.length ? `${cards.length} card` : "no card"}</Badge>
                    <Button size="sm" onClick={() => setQr({ title: `Table ${t.code}`, url: cards[0] ? url(cards[0]) : tableUrl(t.code) })}>QR</Button>
                    {!cards.length && <Button size="sm" onClick={() => crud.create("cards", { tableId: t.id, label: `Card ${t.code}` }).then(() => reload(true)).catch(fail)}>Create card</Button>}
                    <Button size="sm" variant="ghost" onClick={async () => { if (confirm(`Delete table ${t.code}?`)) { try { await crud.remove("tables", t.id); reload(true); } catch (e) { fail(e); } } }}>Delete</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        ))}

      {tab === "nfc" &&
        (data.cards.length === 0 ? (
          <Empty icon="📡" title="No NFC cards" text="Each card holds a unique URL that opens your menu already knowing the table." action={<Button variant="primary" onClick={makeCards}>Generate cards for all tables</Button>} />
        ) : (
          <div className="space-y-3">
            <Card className="!bg-neutral-900/30 text-sm text-neutral-400">
              Write each URL to an NFC tag (NTAG213/215) as a <b className="text-neutral-200">URL record</b> using any NFC writer app. The same URL is printed as a QR fallback. Reassigning a card to another table needs no re-writing — the card ID stays the same.
            </Card>
            {data.cards.map((c) => (
              <Card key={c.id} className="grid items-center gap-3 !p-4 lg:grid-cols-[160px_1fr_200px_auto_auto]">
                <div>
                  <p className="text-sm font-medium text-white">{c.label || "Card"}</p>
                  <Badge tone={c.active ? "green" : "red"}>{c.active ? "active" : "deactivated"}</Badge>
                </div>
                <button className="truncate text-left text-xs text-amber-200/80 hover:underline" onClick={() => { void navigator.clipboard.writeText(url(c)); toast("URL copied"); }} title="Copy URL">
                  {url(c)}
                </button>
                <Select aria-label="Assigned table" value={c.tableId ?? ""} onChange={(e) => crud.update("cards", c.id, { tableId: e.target.value || null }).then(() => { toast("Card reassigned"); reload(true); }).catch(fail)}>
                  <option value="">Unassigned</option>
                  {data.tables.map((t) => <option key={t.id} value={t.id}>Table {t.code}</option>)}
                </Select>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <Toggle checked={c.active} onChange={(v) => crud.update("cards", c.id, { active: v }).then(() => reload(true)).catch(fail)} label="Card active" /> on
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setQr({ title: c.label || "NFC card", url: url(c) })}>QR</Button>
                  <Button size="sm" variant="ghost" onClick={async () => { if (confirm("Delete this card? The printed card will stop working.")) { await crud.remove("cards", c.id); reload(true); } }}>✕</Button>
                </div>
              </Card>
            ))}
          </div>
        ))}

      {bulk && <BulkTables branches={data.branches} existing={data.tables.map((t) => t.code)} onClose={() => setBulk(false)} onDone={() => { setBulk(false); reload(true); }} />}
      {qr && <QrModal title={qr.title} url={qr.url} onClose={() => setQr(null)} />}
      {printing && <PrintSheet data={data} url={url} onClose={() => setPrinting(false)} />}
    </div>
  );
}

function BulkTables({ branches, existing, onClose, onDone }: { branches: Row[]; existing: string[]; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [branchId, setBranchId] = useState(branches[0]?.id);
  const [prefix, setPrefix] = useState("T");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(10);
  const [seats, setSeats] = useState(4);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    let made = 0;
    try {
      for (let i = from; i <= to; i++) {
        const code = `${prefix}${String(i).padStart(2, "0")}`.toUpperCase();
        if (existing.includes(code)) continue;
        await crud.create("tables", { branchId, code, seats });
        made++;
      }
      toast(`Added ${made} tables`);
      onDone();
    } catch (e) {
      toast(`${made} added, then: ${e instanceof Error ? e.message : "failed"}`, "err");
      setBusy(false);
      if (made) onDone();
    }
  };
  return (
    <Modal open onClose={onClose} title="Add tables">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Branch"><Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>
        <Field label="Prefix"><Input value={prefix} onChange={(e) => setPrefix(e.target.value)} maxLength={4} /></Field>
        <Field label="From"><Input type="number" min={1} value={from} onChange={(e) => setFrom(Number(e.target.value))} /></Field>
        <Field label="To"><Input type="number" min={from} max={from + 199} value={to} onChange={(e) => setTo(Number(e.target.value))} /></Field>
        <Field label="Seats"><Input type="number" min={1} value={seats} onChange={(e) => setSeats(Number(e.target.value))} /></Field>
      </div>
      <p className="mt-3 text-xs text-neutral-500">Creates {prefix.toUpperCase()}{String(from).padStart(2, "0")} … {prefix.toUpperCase()}{String(to).padStart(2, "0")}. Existing codes are skipped.</p>
      <Button variant="primary" className="mt-5 w-full" busy={busy} onClick={go}>Create tables</Button>
    </Modal>
  );
}

function useQr(text: string, size = 320) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: "M" }).then(setSrc).catch(() => setSrc(""));
  }, [text, size]);
  return src;
}

function QrModal({ title, url, onClose }: { title: string; url: string; onClose: () => void }) {
  const src = useQr(url, 480);
  return (
    <Modal open onClose={onClose} title={title}>
      <div className="grid place-items-center">
        <div className="rounded-2xl bg-white p-3">{src && /* eslint-disable-next-line @next/next/no-img-element */ <img src={src} alt={`QR code for ${title}`} className="h-64 w-64" />}</div>
        <p className="mt-3 max-w-full break-all text-center text-xs text-neutral-400">{url}</p>
        <div className="mt-4 flex gap-2">
          <a href={src} download={`${title.replace(/\s+/g, "-")}-qr.png`}><Button>Download PNG</Button></a>
          <Button onClick={() => navigator.clipboard.writeText(url)}>Copy URL</Button>
        </div>
      </div>
    </Modal>
  );
}

function PrintCard({ name, table, url, brand }: { name: string; table: string; url: string; brand: string }) {
  const src = useQr(url, 300);
  return (
    <div className="break-inside-avoid rounded-2xl border-2 p-5 text-center text-black" style={{ borderColor: brand, background: "#fff" }}>
      <p className="font-display text-2xl">{name}</p>
      <p className="mt-1 text-xs uppercase tracking-[0.25em] text-neutral-500">Tap your phone here · or scan</p>
      <div className="my-3 text-5xl" aria-hidden>📶</div>
      {src && /* eslint-disable-next-line @next/next/no-img-element */ <img src={src} alt="" className="mx-auto h-36 w-36" />}
      <p className="font-display mt-2 text-4xl" style={{ color: brand }}>{table}</p>
      <p className="mt-1 break-all text-[9px] text-neutral-400">{url}</p>
    </div>
  );
}

function PrintSheet({ data, url, onClose }: { data: D; url: (c: Row) => string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950">
      <div className="no-print sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-neutral-950 p-4">
        <p className="text-sm text-neutral-300">Printable NFC cards — {data.cards.length} cards with QR fallback</p>
        <div className="flex gap-2">
          <Button variant="primary" onClick={() => window.print()}>🖨 Print</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
      <div id="print-area" className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((c) => {
          const t = data.tables.find((x) => x.id === c.tableId);
          return <PrintCard key={c.id} name={data.restaurant.name} table={t ? `Table ${t.code}` : "Unassigned"} url={url(c)} brand={data.restaurant.primaryColor} />;
        })}
      </div>
    </div>
  );
}
