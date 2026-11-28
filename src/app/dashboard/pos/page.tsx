import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { tables } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { CHANNELS } from "@/lib/channelMeta";
import PosApp from "@/components/PosApp";
import { PageHeader } from "@/components/ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "POS" };

export default async function Page() {
  const s = await getSession();
  const rows = s?.restaurantId ? await db.select({ code: tables.code }).from(tables).where(and(eq(tables.restaurantId, s.restaurantId), eq(tables.active, true))).orderBy(asc(tables.code)) : [];
  const codes = rows.map((r) => r.code).filter((c) => !CHANNELS[c]);
  return (
    <div>
      <PageHeader title="Counter POS" sub="Take dine-in, takeaway and delivery orders. They reach the kitchen instantly." />
      <PosApp slug={s!.restaurant!.slug} tableCodes={codes} />
    </div>
  );
}
