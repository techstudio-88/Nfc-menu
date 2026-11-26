import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Create your restaurant" };

export default function Page() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[48rem] -translate-x-1/2 rounded-full bg-orange-500/15 blur-[120px]" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-display text-4xl text-white">
          Tap<span className="gold-text">Menu</span> 3D
        </Link>
        <AuthForm mode="signup" demo={false} />
        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have a workspace?{" "}
          <Link href="/login" className="text-amber-300 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
