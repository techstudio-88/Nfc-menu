/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { Button, cx, Input, Spinner, useToast } from "@/components/ui";

export type Row = Record<string, any>;

export const crud = {
  list: (r: string, q?: string): Promise<Row[]> => api<{ rows: Row[] }>(`/api/owner/${r}${q ? `?${q}` : ""}`).then((x) => x.rows),
  create: (r: string, body: Row): Promise<Row> => api<{ row: Row }>(`/api/owner/${r}`, { body }).then((x) => x.row),
  update: (r: string, id: string, body: Row): Promise<Row> => api<{ row: Row }>(`/api/owner/${r}?id=${id}`, { method: "PATCH", body }).then((x) => x.row),
  remove: (r: string, id: string) => api(`/api/owner/${r}?id=${id}`, { method: "DELETE" }),
};

/** Decimal-currency text input that stores integer minor units. */
export function MoneyInput({ value, onChange, className, ...rest }: { value: number; onChange: (cents: number) => void; className?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  const [txt, setTxt] = useState((value / 100).toFixed(2));
  const last = useRef(value);
  useEffect(() => {
    if (value !== last.current) {
      last.current = value;
      setTxt((value / 100).toFixed(2));
    }
  }, [value]);
  return (
    <Input
      {...rest}
      inputMode="decimal"
      className={className}
      value={txt}
      onChange={(e) => {
        setTxt(e.target.value);
        const n = Math.round(parseFloat(e.target.value.replace(",", ".")) * 100);
        if (Number.isFinite(n)) {
          last.current = n;
          onChange(n);
        }
      }}
      onBlur={() => setTxt((value / 100).toFixed(2))}
    />
  );
}

async function optimizeImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1920 / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image editor is unavailable in this browser.");
  ctx.drawImage(bitmap, 0, 0, width, height); bitmap.close();
  const main = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => b ? resolve(b) : reject(new Error("Could not compress image.")), "image/webp", 0.82));
  const size = Math.min(width, height);
  const thumbCanvas = document.createElement("canvas"); thumbCanvas.width = 480; thumbCanvas.height = 480;
  const thumbCtx = thumbCanvas.getContext("2d");
  if (!thumbCtx) throw new Error("Thumbnail editor is unavailable.");
  thumbCtx.drawImage(canvas, (width-size)/2, (height-size)/2, size, size, 0, 0, 480, 480);
  const thumbnail = await new Promise<Blob>((resolve, reject) => thumbCanvas.toBlob((b) => b ? resolve(b) : reject(new Error("Could not create thumbnail.")), "image/webp", 0.76));
  return { main, thumbnail };
}

export async function uploadAsset(file: File, kind: "image" | "model" | "logo") {
  const fd = new FormData();
  if (kind === "model") fd.append("file", file);
  else {
    const optimized = await optimizeImage(file);
    fd.append("file", new File([optimized.main], file.name.replace(/\\.[^.]+$/, ".webp"), { type: "image/webp" }));
    fd.append("thumbnail", new File([optimized.thumbnail], "thumbnail.webp", { type: "image/webp" }));
  }
  fd.append("kind", kind);
  const res = await fetch("/api/assets", { method: "POST", body: fd });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error ?? "Upload failed");
  return j as { id: string; url: string; thumbnailUrl?: string | null; storage?: string };
}

export function AssetUpload({ kind, label, assetId, url, onChange }: { kind: "image" | "model" | "logo"; label: string; assetId: string | null; url?: string | null; onChange: (id: string | null) => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const preview = assetId ? `/api/assets/${assetId}` : url;
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/50 p-3">
      <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-black/40 text-xl text-neutral-500">
        {kind === "model" ? assetId ? "🧊" : "—" : preview ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={preview} alt="" className="h-full w-full object-cover" /> : "—"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-neutral-500">{kind === "model" ? "Binary glTF (.glb), up to 25 MB" : "JPEG, PNG, WebP · up to 6 MB"}</p>
        <div className="mt-1.5 flex gap-2">
          <Button size="sm" type="button" busy={busy} onClick={() => input.current?.click()}>
            {assetId ? "Replace" : "Upload"}
          </Button>
          {(assetId || (url && kind !== "model")) && (
            <Button size="sm" type="button" variant="ghost" onClick={() => onChange(null)}>
              Remove
            </Button>
          )}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        hidden
        accept={kind === "model" ? ".glb,model/gltf-binary" : "image/jpeg,image/png,image/webp,image/avif"}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          setBusy(true);
          try {
            const r = await uploadAsset(f, kind);
            onChange(r.id);
            toast("Uploaded");
          } catch (er) {
            toast(er instanceof Error ? er.message : "Upload failed", "err");
          } finally {
            setBusy(false);
          }
        }}
      />
    </div>
  );
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string; disabled?: boolean }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-neutral-900/60 p-1">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={value === t.id} disabled={t.disabled} onClick={() => onChange(t.id)} className={cx("shrink-0 rounded-lg px-4 py-2 text-sm transition disabled:opacity-40", value === t.id ? "bg-amber-500/20 text-amber-200" : "text-neutral-400 hover:text-white")}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Saving({ on }: { on: boolean }) {
  return on ? <Spinner className="h-3.5 w-3.5" /> : null;
}
