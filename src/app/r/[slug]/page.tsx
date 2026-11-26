import type { Metadata } from "next";
import CustomerApp from "@/components/customer/CustomerApp";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Menu · ${slug}`, description: "Tap, see your dish in 3D, customise and order." };
}

export default async function Page({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ table?: string; c?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;
  return <CustomerApp slug={slug.toLowerCase()} table={sp.table?.slice(0, 20)} card={sp.c?.slice(0, 40)} />;
}
