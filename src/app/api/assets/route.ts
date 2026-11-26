import { db } from "@/db";
import { foodAssets } from "@/db/schema";
import { handle, HttpError } from "@/lib/api";
import { OWNER_ROLES, requireTenant } from "@/lib/auth";

const IMG = ["image/jpeg", "image/png", "image/webp", "image/avif"];

export const POST = handle(async (req) => {
  const t = await requireTenant(OWNER_ROLES, { write: true });
  const form = await req.formData();
  const file = form.get("file");
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
    if (buf.length > 6 * 1024 * 1024) throw new HttpError(400, "Images are limited to 6 MB.");
  }
  const [a] = await db
    .insert(foodAssets)
    .values({ restaurantId: t.restaurantId, kind, filename: file.name.slice(0, 120), mime, size: buf.length, data: buf })
    .returning({ id: foodAssets.id });
  return { id: a.id, url: `/api/assets/${a.id}` };
});
