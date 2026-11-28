import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foodAssets } from "@/db/schema";
import { isUuid } from "@/lib/api";

// Public immutable menu assets are delivered from Supabase Storage CDN when available.
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const [a] = await db.select().from(foodAssets).where(eq(foodAssets.id, id)).limit(1);
  if (!a) return new Response("Not found", { status: 404 });

  if (a.storageBucket && a.storagePath) {
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!base) return new Response("Asset unavailable", { status: 503 });
    const thumb = req.nextUrl.searchParams.get("variant") === "thumb" && a.thumbnailPath;
    const path = thumb ? a.thumbnailPath! : a.storagePath;
    const url = `${base}/storage/v1/object/public/${a.storageBucket}/${path.split("/").map(encodeURIComponent).join("/")}`;
    return Response.redirect(url, 302);
  }
  if (!a.data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(a.data), {
    headers: {
      "content-type": a.mime,
      "content-length": String(a.size),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
