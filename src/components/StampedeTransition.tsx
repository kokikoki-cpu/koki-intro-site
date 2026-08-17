"use client";

import { useEffect } from "react";
import { PROFILE } from "@/lib/data";

/** 演出の総尺。globals.css 側の fade-out（3000ms 開始 + 760ms）が終わってから畳む */
const DURATION = 3820;

/** 群れの構成。大きい個体ほど手前 = 画面下・速い、という置き方で奥行きを出す */
const HERD = [
  { top: "44%", width: 190, dur: 1.75, delay: 0.0, color: "#332615" },
  { top: "50%", width: 240, dur: 1.5, delay: 0.5, color: "#241a0f" },
  { top: "57%", width: 320, dur: 1.15, delay: 0.15, color: "#180f07" },
  { top: "62%", width: 360, dur: 1.05, delay: 0.72, color: "#120c06" },
  { top: "66%", width: 410, dur: 0.95, delay: 0.4, color: "#0f0a05" },
  { top: "71%", width: 470, dur: 0.85, delay: 1.05, color: "#0b0703" },
  { top: "54%", width: 280, dur: 1.3, delay: 1.28, color: "#1a1209" },
];

/** 頭を下げて突進する牛のシルエット。肩のこぶと大きな角で「牛」に見せる */
function Bull({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 140 96" width="100%" height="auto" fill={color} aria-hidden>
      {/* 脚（走りに合わせて前後に振れる） */}
      <path className="stampede__leg" d="M38 54 h9 l-3 34 h-8z" />
      <path className="stampede__leg stampede__leg--b" d="M51 54 h9 l-4 34 h-8z" />
      <path className="stampede__leg stampede__leg--b" d="M83 54 h9 l-3 34 h-8z" />
      <path className="stampede__leg" d="M95 54 h9 l-4 34 h-8z" />
      {/* 尻尾 */}
      <path d="M30 33 L15 20 L19 16 L25 23 L34 31 Z" />
      {/* 胴・肩のこぶ・下げた頭 */}
      <path d="M29 35 C31 26 43 23 57 23 C69 22 75 19 82 20 C91 21 97 26 102 33 L114 36 L132 41 L133 49 L120 54 L105 53 C100 57 92 59 82 59 L44 59 C33 59 27 46 29 35 Z" />
      {/* 角（手前・奥の2本） */}
      <path d="M103 33 C98 23 105 13 116 14 C109 19 106 26 109 34 Z" />
      <path d="M111 36 C114 27 123 21 131 24 C123 27 119 32 118 39 Z" />
      {/* 耳 */}
      <path d="M99 36 L91 32 L94 40 Z" />
    </svg>
  );
}

export default function StampedeTransition({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const id = window.setTimeout(onDone, DURATION);
    return () => window.clearTimeout(id);
  }, [onDone]);

  return (
    <div className="stampede" role="presentation">
      <div className="stampede__scene">
        {HERD.map((b, i) => (
          <div
            key={i}
            className="stampede__bull"
            style={{
              top: b.top,
              width: b.width,
              animationDuration: `${b.dur}s`,
              animationDelay: `${b.delay}s`,
            }}
          >
            <Bull color={b.color} />
          </div>
        ))}
        <div className="stampede__dust" />
      </div>

      <div className="stampede__bars" />

      <div className="stampede__title">
        <p className="font-display text-[clamp(2rem,7vw,4rem)] font-extrabold">{PROFILE.name}</p>
        <p className="font-display text-sm font-bold md:text-base">{PROFILE.tagline}</p>
      </div>
    </div>
  );
}
