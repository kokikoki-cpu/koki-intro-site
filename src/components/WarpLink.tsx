"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type ReactNode } from "react";
import Rocket from "./Rocket";

/** 流れる星の線。位置と遅れを散らす */
const STREAKS = Array.from({ length: 26 }, (_, i) => ({
  left: `${(i * 3.9 + ((i * 23) % 9)) % 100}%`,
  delay: ((i * 11) % 9) * 45,
}));

/**
 * 押すとロケットが飛んでからページを移動するリンク。
 * 星系 ⇄ 惑星の行き来を「宇宙船で渡っている」感覚にするためのもの。
 */
export default function WarpLink({
  href,
  className,
  title,
  style,
  children,
}: {
  href: string;
  className?: string;
  title?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();
  const [flying, setFlying] = useState(false);

  const go = (e: React.MouseEvent) => {
    // 別タブで開きたい場合は邪魔しない
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (flying) return;
    setFlying(true);
    // 演出の終わりに合わせて移動する（globals.css の 1100ms と揃える）
    window.setTimeout(() => router.push(href), 900);
  };

  return (
    <>
      <a href={href} onClick={go} className={className} title={title} style={style}>
        {children}
      </a>

      {flying && (
        <span className="warp" aria-hidden>
          {STREAKS.map((s, i) => (
            <span
              key={i}
              className="warp__streak"
              style={{ left: s.left, "--d": `${s.delay}ms` } as CSSProperties}
            />
          ))}
          <span className="warp__ship">
            <Rocket size={64} />
          </span>
        </span>
      )}
    </>
  );
}
