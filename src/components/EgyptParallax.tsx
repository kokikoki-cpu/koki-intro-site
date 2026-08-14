"use client";

import { useEffect, useRef } from "react";

export default function EgyptParallax() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    if (window.matchMedia("(hover: none)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const hero = root.closest(".hero-section") as HTMLElement | null;
    if (!hero) return;
    const layers = [...root.querySelectorAll<HTMLElement>(".egypt-layer")];

    function onMove(e: MouseEvent) {
      const rect = hero!.getBoundingClientRect();
      const relX = (e.clientX - rect.left) / rect.width - 0.5;
      const relY = (e.clientY - rect.top) / rect.height - 0.5;
      layers.forEach((layer) => {
        const depth = parseFloat(layer.dataset.depth || "0.05");
        layer.style.transform = `translate(${relX * depth * 220}px, ${relY * depth * 220}px)`;
      });
    }
    function onLeave() {
      layers.forEach((layer) => (layer.style.transform = ""));
    }

    hero.addEventListener("mousemove", onMove);
    hero.addEventListener("mouseleave", onLeave);
    return () => {
      hero.removeEventListener("mousemove", onMove);
      hero.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-visible" aria-hidden>
      <svg
        className="egypt-layer absolute -top-[10%] right-[6%] w-[clamp(90px,12vw,150px)] transition-transform duration-150 ease-out"
        data-depth="0.02"
        viewBox="0 0 200 200"
      >
        <circle cx="100" cy="90" r="50" fill="var(--color-ink-soft)" opacity="0.18" />
      </svg>
      <svg
        className="egypt-layer absolute top-[8%] -right-[4%] w-[clamp(160px,22vw,300px)] transition-transform duration-150 ease-out"
        data-depth="0.05"
        viewBox="0 0 300 180"
      >
        <polygon
          points="90,20 190,170 -10,170"
          fill="none"
          stroke="var(--color-ink-soft)"
          strokeWidth="1.4"
          opacity="0.25"
        />
      </svg>
      <svg
        className="egypt-layer absolute top-[18%] right-[4%] w-[clamp(140px,18vw,240px)] transition-transform duration-150 ease-out"
        data-depth="0.08"
        viewBox="0 0 300 180"
      >
        <polygon
          points="180,50 270,170 90,170"
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="1.4"
          opacity="0.2"
        />
      </svg>
      <svg
        className="egypt-layer absolute inset-x-0 -bottom-px w-full transition-transform duration-150 ease-out"
        data-depth="0.03"
        viewBox="0 0 300 40"
        preserveAspectRatio="none"
      >
        <path d="M0,20 Q75,0 150,20 T300,20 V40 H0 Z" fill="var(--color-bg-soft)" opacity="0.6" />
      </svg>
    </div>
  );
}
