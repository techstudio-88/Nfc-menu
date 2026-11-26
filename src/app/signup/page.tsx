import Link from "next/link";

export const metadata = { title: "Request restaurant access" };

const recipient = "techstudio7808@gmail.com";
const subject = encodeURIComponent("TapMenu restaurant workspace access request");
const body = encodeURIComponent("Hello TechStudio,\n\nI would like to request access to a TapMenu restaurant workspace.\n\nName:\nRestaurant name:\nPhone / WhatsApp:\nCity:\n\nThank you.");
const mailto = `mailto:${recipient}?subject=${subject}&body=${body}`;

export default function Page() {
  return (
    <main className="senso-auth relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div className="senso-auth-glow pointer-events-none absolute inset-0" />
      <section className="senso-auth-card relative w-full max-w-xl rounded-[2rem] border p-7 shadow-2xl backdrop-blur-2xl sm:p-10">
        <Link href="/" className="senso-wordmark block text-center text-2xl">TAPMENU</Link>
        <p className="mt-10 text-center text-[10px] tracking-[.25em] text-[#e56a70]">WORKSPACE ACCESS</p>
        <h1 className="senso-heading mt-4 text-center text-4xl sm:text-5xl">Let’s bring your<br /><em>restaurant online.</em></h1>
        <p className="mx-auto mt-5 max-w-md text-center text-sm leading-7 text-white/55">Restaurant workspaces are created by the TapMenu team after a quick access request. Send us your details and our admin will help you get set up.</p>
        <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-5">
          <p className="text-[9px] tracking-[.2em] text-white/40">OFFICIAL ADMIN EMAIL</p>
          <p className="mt-2 break-all text-lg text-white">techstudio7808@gmail.com</p>
          <a href={mailto} className="senso-red-button mt-5 flex w-full px-6 py-4 text-center text-[10px] font-semibold tracking-[.12em]">REQUEST WORKSPACE ACCESS ↗</a>
        </div>
        <div className="mt-7 flex flex-col items-center gap-3 text-sm text-white/50">
          <Link href="/login" className="transition hover:text-white">Already have credentials? <span className="text-[#e56a70]">Log in</span></Link>
          <Link href="/" className="text-xs text-white/35 hover:text-white">Back to TapMenu</Link>
        </div>
      </section>
    </main>
  );
}
