"use client";

import WarpLink from "@/components/WarpLink";
import Rocket from "@/components/Rocket";

/**
 * 太陽系（トップ）へ戻る導線。ヘッダーのタブを外したので、ここが唯一の帰り道。
 * 押すとロケットが飛んでから移動する。
 */
export default function ReturnToSystem() {
  return (
    <WarpLink
      href="/"
      title="星系へ戻る"
      className="group fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-(--color-nebula) bg-(--color-ink)/92 py-2.5 pl-3 pr-6 text-(--color-white) shadow-[0_0_30px_rgba(216,111,168,0.4)] backdrop-blur-sm transition hover:scale-105 hover:border-(--color-ember) md:bottom-7 md:left-7 md:translate-x-0"
    >
      <span className="ship flex h-12 w-12 flex-none items-center justify-center">
        <Rocket size={40} />
      </span>
      <span className="text-left leading-tight">
        <span className="block text-[11px] tracking-widest text-(--color-ember)">RETURN</span>
        <span className="block font-display text-base font-bold">星系へ戻る</span>
      </span>
    </WarpLink>
  );
}
