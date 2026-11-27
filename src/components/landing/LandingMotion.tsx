"use client";

import { useEffect } from "react";

export default function LandingMotion() {
  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".senso-page [data-reveal]"));
    if (!targets.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const node = entry.target as HTMLElement;
          node.classList.add("is-visible");
          observer.unobserve(node);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -7% 0px" });
    targets.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);
  return null;
}
