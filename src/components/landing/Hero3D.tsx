"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const Food3D = dynamic(() => import("@/components/customer/Food3D"), { ssr: false });
const LAYERS = ["layer:pepperoni", "layer:mushroom", "layer:olive", "layer:basil", "layer:pepper", "layer:cheese"];

export default function Hero3D() {
  const [ok, setOk] = useState(false);
  const [n, setN] = useState(2);
  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = !!(c.getContext("webgl2") || c.getContext("webgl"));
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setOk(gl && !reduce);
    } catch {
      setOk(false);
    }
    const i = setInterval(() => setN((x) => (x >= LAYERS.length ? 1 : x + 1)), 1400);
    return () => clearInterval(i);
  }, []);
  if (!ok) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/food/pizza.jpg" alt="Wood-fired pizza" className="h-full w-full rounded-full object-cover" />;
  }
  return <Food3D visual="pizza" layers={LAYERS.slice(0, n)} scale={1.15} />;
}
