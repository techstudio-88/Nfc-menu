import { guard } from "@/lib/guard";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await guard("kitchen");
  return <>{children}</>;
}
