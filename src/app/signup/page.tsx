"use client";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/client";

export default function Page() {
  const [form,setForm] = useState({name:"",restaurantName:"",email:"",phone:"",city:"",message:""});
  const [busy,setBusy] = useState(false);
  const [sent,setSent] = useState(false);
  const [error,setError] = useState("");
  const set=(key:string,value:string)=>setForm(old=>({...old,[key]:value}));
  const submit=async(e:React.FormEvent)=>{e.preventDefault();setBusy(true);setError("");try{await api("/api/access-request",{body:form});setSent(true);}catch(err){setError(err instanceof Error?err.message:"Unable to submit request.");}finally{setBusy(false);}};
  return (
    <main className="senso-auth relative grid min-h-dvh place-items-center overflow-hidden px-4 py-12">
      <div className="senso-auth-glow pointer-events-none absolute inset-0" />
      <section className="senso-auth-card relative w-full max-w-xl rounded-[2rem] border p-7 shadow-2xl backdrop-blur-2xl sm:p-10">
        <Link href="/" className="senso-wordmark block text-center text-2xl">TAPMENU</Link>
        {sent ? <div className="py-10 text-center"><div className="text-4xl text-rose-400">✓</div><h1 className="senso-heading mt-5 text-4xl">Request received.</h1><p className="mt-4 text-sm leading-7 text-white/55">Your request is now in the TechStudio admin queue. Workspace access is granted only after approval.</p></div> : <>
          <p className="mt-9 text-center text-[10px] tracking-[.25em] text-[#e56a70]">WORKSPACE ACCESS REQUEST</p>
          <h1 className="senso-heading mt-4 text-center text-4xl sm:text-5xl">Let’s bring your<br/><em>restaurant online.</em></h1>
          <p className="mx-auto mt-4 max-w-md text-center text-sm leading-7 text-white/55">No public self-signup. Send your details to the TechStudio team. We review requests and create approved restaurant workspaces for you.</p>
          <form onSubmit={submit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="text-xs text-white/65">Your name<input required maxLength={100} value={form.name} onChange={e=>set("name",e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label>
            <label className="text-xs text-white/65">Restaurant name<input required maxLength={120} value={form.restaurantName} onChange={e=>set("restaurantName",e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label>
            <label className="text-xs text-white/65">Email<input required type="email" maxLength={180} value={form.email} onChange={e=>set("email",e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label>
            <label className="text-xs text-white/65">Phone / WhatsApp<input maxLength={40} value={form.phone} onChange={e=>set("phone",e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label>
            <label className="text-xs text-white/65 sm:col-span-2">City<input maxLength={100} value={form.city} onChange={e=>set("city",e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label>
            <label className="text-xs text-white/65 sm:col-span-2">Anything we should know?<textarea maxLength={1000} rows={3} value={form.message} onChange={e=>set("message",e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"/></label>
            {error&&<p role="alert" className="text-sm text-rose-300 sm:col-span-2">{error}</p>}
            <button disabled={busy} className="senso-red-button w-full px-6 py-4 text-[10px] font-semibold tracking-[.12em] disabled:opacity-50 sm:col-span-2">{busy?"SENDING REQUEST…":"SEND ACCESS REQUEST ↗"}</button>
          </form>
          <p className="mt-5 text-center text-xs text-white/40">Prefer email? <a className="text-rose-300 underline" href="mailto:techstudio7808@gmail.com">techstudio7808@gmail.com</a></p>
        </>}
        <div className="mt-7 flex flex-col items-center gap-3 text-sm text-white/50"><Link href="/login" className="hover:text-white">Already have credentials? <span className="text-[#e56a70]">Log in</span></Link><Link href="/" className="text-xs text-white/35 hover:text-white">Back to TapMenu</Link></div>
      </section>
    </main>
  );
}
