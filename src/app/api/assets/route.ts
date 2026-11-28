import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { foodAssets } from "@/db/schema";
import { handle, HttpError } from "@/lib/api";
import { OWNER_ROLES, requireTenant } from "@/lib/auth";

const IMG = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const extFor = (mime: string) => mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/avif" ? "avif" : "webp";

async function putStorage(bucket: string, path: string, file: Blob, mime: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new Error("Supabase Storage server credentials are not configured.");
  const response = await fetch(`${base}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": mime, "Cache-Control": "31536000", "x-upsert": "false" },
    body: file,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase Storage upload failed (${response.status}).`);
}

export const POST = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const form = await req.formData();
  const file = form.get("file");
  const thumb = form.get("thumbnail");
  const kind = String(form.get("kind") ?? "image");
  if (!(file instanceof File)) throw new HttpError(400, "No file uploaded.");
  if (!["image", "model", "logo"].includes(kind)) throw new HttpError(400, "Invalid asset kind.");
  const buf = Buffer.from(await file.arrayBuffer());
  let mime = file.type;
  if (kind === "model") {
    if (!/\.glb$/i.test(file.name) || buf.subarray(0, 4).toString("ascii") !== "glTF") throw new HttpError(400, "Please upload a binary glTF (.glb) file.");
    if (buf.length > 25 * 1024 * 1024) throw new HttpError(400, "3D models are limited to 25 MB.");
    mime = "model/gltf-binary";
  } else {
    if (!IMG.includes(mime)) throw new HttpError(400, "Images must be JPEG, PNG, WebP or AVIF.");
    if (buf.length > 4 * 1024 * 1024) throw new HttpError(400, "Optimized images must be under 4 MB.");
  }

  const isDemo = t.user.email.startsWith("demo-") && t.user.email.endsWith("@tapmenu.invalid");
  const bucket = isDemo ? "demo-assets" : "restaurant-assets";
  const id = randomUUID();
  const ext = kind === "model" ? "glb" : extFor(mime);
  const storagePath = `${t.restaurantId}/${id}.${ext}`;
  const storageReady = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (storageReady) {
    try {
      await putStorage(bucket, storagePath, new Blob([new Uint8Array(buf)], { type: mime }), mime);
      let thumbnailPath: string | null = null;
      if (kind !== "model" && thumb instanceof File && thumb.size > 0 && thumb.size <= 500 * 1024 && thumb.type === "image/webp") {
        thumbnailPath = `${t.restaurantId}/${id}-thumb.webp`;
        await putStorage(bucket, thumbnailPath, thumb, thumb.type);
      }
      const [a] = await db.insert(foodAssets).values({
        id, restaurantId: t.restaurantId, kind, filename: file.name.slice(0, 120), mime,
        size: buf.length, data: null, storageBucket: bucket, storagePath, thumbnailPath, isDemo,
      }).returning({ id: foodAssets.id });
      return { id: a.id, url: `/api/assets/${a.id}`, thumbnailUrl: thumbnailPath ? `/api/assets/${a.id}?variant=thumb` : null, storage: "supabase" };
    } catch (error) {
      console.error("[assets] Supabase Storage upload failed", error);
      throw new HttpError(503, "Photo storage is temporarily unavailable. Please try again.");
    }
  }

  // Compatibility path keeps existing uploads working until SUPABASE_SERVICE_ROLE_KEY is added in Vercel.
  const [a] = await db.insert(foodAssets).values({
    restaurantId: t.restaurantId, kind, filename: file.name.slice(0, 120), mime, size: buf.length,
    data: buf, isDemo,
  }).returning({ id: foodAssets.id });
  return { id: a.id, url: `/api/assets/${a.id}`, storage: "database-fallback" };
});
