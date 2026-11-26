import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in" };

export default function Page() {
  const demo = process.env.TAPMENU_SEED_DEMO !== "false";
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-rose-700/20 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-display text-4xl text-white">
          Tap<span className="gold-text">Menu</span> 3D
        </Link>
        <AuthForm mode="login" demo={demo} />
        <p className="mt-6 text-center text-sm text-neutral-500">
          Need a restaurant workspace?{" "}
          <Link href="/signup" className="text-rose-300 hover:underline">
            Request access
          </Link>
        </p>
      </div>
    </div>
  );
}
