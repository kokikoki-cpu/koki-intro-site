"use client";

import { useEffect, useRef } from "react";

/**
 * 銀河の背景。ピンクの星雲・金色の核・塵の帯を寝かせた円盤として重ねる。
 * マウス（スマホは指）の位置に応じて層ごとに違う量だけずらし、奥行きを出す。
 * 座標は CSS 変数で渡すので、動かすたびに React が再描画しない。
 */
export default function GalaxyBackdrop() {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      el.style.setProperty("--mx", `${(-nx * 46).toFixed(1)}px`);
      el.style.setProperty("--my", `${(-ny * 34).toFixed(1)}px`);
    };

    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <div ref={rootRef} className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="galaxy">
        <div className="galaxy__layer galaxy__dust" style={{ ["--depth" as string]: 0.4 }} />
        <div className="galaxy__layer galaxy__nebula" style={{ ["--depth" as string]: 0.7 }} />
        <div className="galaxy__layer galaxy__core" style={{ ["--depth" as string]: 1.4 }} />

        {/* 円盤を囲む輪。参考画像の白い線 */}
        {[62, 74, 86, 98].map((size) => (
          <div
            key={size}
            className="galaxy__ring"
            style={{
              width: `${size}%`,
              height: `${size}%`,
              left: `${(100 - size) / 2}%`,
              top: `${(100 - size) / 2}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
