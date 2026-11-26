import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { foodAssets } from "@/db/schema";
import { isUuid } from "@/lib/api";

// Assets are public menu content addressed by unguessable UUIDs and are immutable.
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const [a] = await db.select().from(foodAssets).where(eq(foodAssets.id, id)).limit(1);
  if (!a) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(a.data), {
    headers: {
      "content-type": a.mime,
      "content-length": String(a.size),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
