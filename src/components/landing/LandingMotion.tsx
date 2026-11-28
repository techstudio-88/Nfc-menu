"use client";

import { useEffect } from "react";

/** Scroll-reveal. Content is only hidden once JS is running, so the page never blanks without it. */
export default function LandingMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!targets.length || reduce || !("IntersectionObserver" in window)) return;
    root.classList.add("js-reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" },
    );
    targets.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      root.classList.remove("js-reveal");
    };
  }, []);
  return null;
}
