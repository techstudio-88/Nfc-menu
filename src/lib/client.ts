"use client";
import { useCallback, useEffect, useRef, useState } from "react";

/* ───────── fetch wrapper ───────── */
export async function api<T = any>(url: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(url, {
    method: opts.method ?? (opts.body ? "POST" : "GET"),
    headers: opts.body ? { "content-type": "application/json" } : undefined,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: "no-store",
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* empty */
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== "undefined" && !url.startsWith("/api/auth")) window.location.href = "/login";
    throw new Error(data?.error ?? `Request failed (${res.status})`);
  }
  return data as T;
}

export function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function minutesSince(iso: string, now: number) {
  return Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
}
export function clock(iso: string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/* ───────── sound (WebAudio – no asset files) ───────── */
let actx: AudioContext | null = null;
export function unlockAudio() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    actx ??= new AC();
    void actx.resume();
    return actx.state === "running" || actx.state === ("suspended" as string);
  } catch {
    return false;
  }
}
export function playSound(name: string): boolean {
  if (name === "none") return true;
  if (!actx || actx.state !== "running") return false;
  const t0 = actx.currentTime;
  const tone = (freq: number, start: number, dur: number, type: OscillatorType, gain = 0.25) => {
    const o = actx!.createOscillator();
    const g = actx!.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0 + start);
    g.gain.exponentialRampToValueAtTime(gain, t0 + start + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + start + dur);
    o.connect(g).connect(actx!.destination);
    o.start(t0 + start);
    o.stop(t0 + start + dur + 0.05);
  };
  if (name === "bell") [0, 0.35, 0.7].forEach((s) => tone(660, s, 0.6, "triangle", 0.3));
  else if (name === "pulse") [0, 0.2, 0.4].forEach((s) => tone(520, s, 0.12, "square", 0.12));
  else {
    tone(880, 0, 0.35, "sine");
    tone(1320, 0.18, 0.5, "sine");
  }
  return true;
}

/* ───────── realtime hook ───────── */
export type RtEvent = { id: number; type: string; title: string; body: string; orderId: string | null; createdAt: string };

export function useRealtime(opts: { scope: "owner" | "kitchen" | "staff"; station?: string | null; onEvents: (e: RtEvent[]) => void; enabled?: boolean }) {
  const { scope, station, enabled = true } = opts;
  const cb = useRef(opts.onEvents);
  cb.current = opts.onEvents;
  const cursor = useRef<number | null>(null);
  const [connected, setConnected] = useState(true);
  const [audioReady, setAudioReady] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const [blocked, setBlocked] = useState(false);
  const [lastEvent, setLastEvent] = useState<RtEvent | null>(null);
  const fails = useRef(0);

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const enableAlerts = useCallback(async () => {
    setAudioReady(unlockAudio());
    playSound("pulse");
    setBlocked(false);
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try {
        setPerm(await Notification.requestPermission());
      } catch {
        /* ignore */
      }
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    cursor.current = null;
    const baseTitle = document.title;
    let flash: ReturnType<typeof setInterval> | null = null;
    const stopFlash = () => {
      if (flash) clearInterval(flash);
      flash = null;
      document.title = baseTitle;
    };
    const onVis = () => {
      if (!document.hidden) {
        stopFlash();
        void tick();
      }
    };

    async function tick() {
      clearTimeout(timer);
      if (stopped) return;
      try {
        const qs = new URLSearchParams({ scope });
        if (station) qs.set("station", station);
        if (cursor.current !== null) qs.set("since", String(cursor.current));
        const r = await api<{ events: RtEvent[]; cursor: number; sound: { enabled: boolean; name: string } }>(`/api/realtime?${qs}`);
        fails.current = 0;
        setConnected(true);
        const first = cursor.current === null;
        cursor.current = r.cursor;
        if (!first && r.events.length) {
          cb.current(r.events);
          setLastEvent(r.events[r.events.length - 1]);
          const loud = r.events.some((e) => ["order_new", "order_ready", "assist", "order_assigned"].includes(e.type));
          if (loud && r.sound.enabled) {
            const ok = playSound(r.sound.name);
            if (!ok) setBlocked(true);
          }
          if (loud && typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
            try {
              const e = r.events[r.events.length - 1];
              new Notification(e.title, { body: e.body, tag: "tapmenu-" + e.type });
            } catch {
              /* some mobile browsers only allow SW notifications */
            }
          }
          if (document.hidden && !flash) {
            let on = false;
            flash = setInterval(() => {
              on = !on;
              document.title = on ? "🔔 New activity" : baseTitle;
            }, 900);
          }
        }
      } catch {
        fails.current++;
        if (fails.current >= 2) setConnected(false);
      }
      if (!stopped) timer = setTimeout(tick, Math.min(15000, 2500 * Math.max(1, fails.current * 1.5)));
    }
    void tick();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("online", tick);
    return () => {
      stopped = true;
      clearTimeout(timer);
      stopFlash();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("online", tick);
    };
  }, [scope, station, enabled]);

  return { connected, audioReady, enableAlerts, perm, blocked, lastEvent };
}

/* ───────── speech (Web Speech API) ───────── */
export function useSpeech() {
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "speaking" | "paused">("idle");
  const lastText = useRef("");
  const token = useRef(0);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  const stop = useCallback(() => {
    token.current++;
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setState("idle");
  }, []);

  const speak = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) return;
    lastText.current = text;
    window.speechSynthesis.cancel();
    const my = ++token.current;
    const parts = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
    setState("speaking");
    parts.forEach((p, i) => {
      const u = new SpeechSynthesisUtterance(p);
      u.rate = 0.97;
      u.lang = document.documentElement.lang || "en";
      if (i === parts.length - 1) {
        u.onend = () => token.current === my && setState("idle");
        u.onerror = () => token.current === my && setState("idle");
      }
      window.speechSynthesis.speak(u);
    });
  }, []);

  const pause = useCallback(() => {
    window.speechSynthesis.pause();
    setState("paused");
  }, []);
  const resume = useCallback(() => {
    window.speechSynthesis.resume();
    setState("speaking");
  }, []);
  const replay = useCallback(() => lastText.current && speak(lastText.current), [speak]);
  return { supported, state, speak, pause, resume, stop, replay };
}
