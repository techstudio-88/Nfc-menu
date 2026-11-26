import { eq } from "drizzle-orm";
import { db } from "@/db";
import { restaurants } from "@/db/schema";
import { handle, HttpError } from "@/lib/api";
import { enabledMethods, getSettings, loadMenuTree, resolveTable } from "@/lib/orders";
import { onlineProviderReady } from "@/lib/payments";
import { ensureDemo } from "@/lib/seed";

export const dynamic = "force-dynamic";

export const GET = handle(async (req, ctx) => {
  const { slug } = await ctx.params;
  await ensureDemo();
  const [r] = await db.select().from(restaurants).where(eq(restaurants.slug, slug.toLowerCase())).limit(1);
  if (!r) throw new HttpError(404, "Restaurant not found.");
  const settings = await getSettings(r.id);
  const base = {
    restaurant: {
      name: r.name,
      slug: r.slug,
      tagline: r.tagline,
      logoUrl: r.logoAssetId ? `/api/assets/${r.logoAssetId}` : null,
      coverUrl: r.coverAssetId ? `/api/assets/${r.coverAssetId}` : null,
      primaryColor: r.primaryColor,
      accentColor: r.accentColor,
      theme: r.theme,
      defaultLanguage: r.defaultLanguage,
      languages: r.languages,
    },
  };
  if (r.status !== "active") return { ...base, suspended: true };
  const sp = req.nextUrl.searchParams;
  const tr = await resolveTable(r.id, sp.get("table"), sp.get("c"));
  const methods = enabledMethods(settings).filter((m) => m !== "online" || onlineProviderReady());
  return {
    ...base,
    suspended: false,
    settings: {
      currency: settings.currency,
      taxRateBps: settings.taxRateBps,
      taxLabel: settings.taxLabel,
      serviceChargeBps: settings.serviceChargeBps,
      feeCents: settings.feeCents,
      feeLabel: settings.feeLabel,
      autoDiscountBps: settings.autoDiscountBps,
      orderingEnabled: settings.orderingEnabled,
      paymentMethods: methods,
    },
    table: tr.status === "ok" ? { status: "ok", code: tr.table.code } : { status: tr.status },
    menu: await loadMenuTree(r.id, settings.timezone),
  };
});
