import Link from "next/link";

/**
 * 下層ページから太陽系（トップ）へ戻る導線。
 * ヘッダーのタブを外したので、ここが唯一の帰り道になる。
 * 見落とされると迷子になるため、宇宙船を大きく描いて浮かせ、噴射を明滅させている。
 */
export default function ReturnToSystem() {
  return (
    <Link
      href="/"
      aria-label="星系へ戻る"
      className="group fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 rounded-full border-2 border-(--color-accent-light) bg-(--color-ink)/92 py-2.5 pl-3 pr-6 text-(--color-white) shadow-[0_0_28px_rgba(133,180,141,0.35)] backdrop-blur-sm transition hover:scale-105 hover:bg-(--color-accent-dark) md:bottom-7 md:left-7 md:translate-x-0"
    >
      <span className="ship relative flex h-11 w-11 flex-none items-center justify-center">
        <svg width="40" height="40" viewBox="0 0 40 44" aria-hidden>
          {/* 噴射 */}
          <path className="ship__flame" d="M20 34 L15 44 L20 40 L25 44 Z" fill="#e8a05c" />
          {/* 機体 */}
          <path
            d="M20 2c5 5 8 11.5 8 18.5V31l-8 5-8-5V20.5C12 13.5 15 7 20 2z"
            fill="#fffdf8"
            stroke="#1a1c16"
            strokeWidth="1.6"
          />
          {/* 翼 */}
          <path d="M12 22 L4 30 L6 36 L12 32 Z" fill="#85b48d" stroke="#1a1c16" strokeWidth="1.4" />
          <path d="M28 22 L36 30 L34 36 L28 32 Z" fill="#85b48d" stroke="#1a1c16" strokeWidth="1.4" />
          {/* 窓 */}
          <circle cx="20" cy="17" r="3.6" fill="#3f5c43" stroke="#1a1c16" strokeWidth="1.4" />
        </svg>
      </span>

      <span className="text-left leading-tight">
        <span className="block text-[11px] tracking-widest text-(--color-accent-light)">
          RETURN
        </span>
        <span className="block font-display text-base font-bold">星系へ戻る</span>
      </span>
    </Link>
  );
}
