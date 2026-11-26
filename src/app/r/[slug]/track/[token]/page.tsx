import type { Metadata } from "next";
import TrackApp from "@/components/customer/TrackApp";

export const metadata: Metadata = { title: "Your order" };
export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  return <TrackApp slug={slug} token={token} />;
}
