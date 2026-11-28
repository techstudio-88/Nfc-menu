import Link from "next/link";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in" };

export default function Page() {
  const demo = process.env.TAPMENU_SEED_DEMO !== "false";
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-4 py-10">
      <div className="senso-auth-glow pointer-events-none absolute inset-0" />
      <div className="relative w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-display text-4xl text-ink">Tap<span className="gold-text">Menu</span> 3D</Link>
        <AuthForm mode="login" demo={demo} />
        <p className="mt-6 text-center text-sm text-mute">
          Need a restaurant workspace?{" "}
          <Link href="/signup" className="font-medium text-brand hover:underline">Request access</Link>
        </p>
      </div>
    </div>
  );
}
