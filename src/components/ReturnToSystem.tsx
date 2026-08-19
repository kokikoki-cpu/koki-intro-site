import Link from "next/link";

/**
 * 下層ページから太陽系（トップ）へ戻る導線。
 * ヘッダーのタブを外したぶん、各ページに必ずこれを置いて迷子を防ぐ。
 */
export default function ReturnToSystem() {
  return (
    <Link
      href="/"
      className="group fixed bottom-4 left-4 z-40 flex items-center gap-2 rounded-full border border-(--color-white)/25 bg-(--color-ink)/85 py-2 pl-3 pr-4 text-sm font-bold text-(--color-white) backdrop-blur-sm transition hover:border-(--color-accent-light) hover:bg-(--color-accent-dark)"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition group-hover:-translate-x-0.5"
        aria-hidden
      >
        {/* 宇宙船 */}
        <path d="M12 2c2.6 2.4 4 5.6 4 9v5l-4 3-4-3v-5c0-3.4 1.4-6.6 4-9z" />
        <path d="M8 12l-3 3 1 3 2-1.5M16 12l3 3-1 3-2-1.5" />
        <circle cx="12" cy="9" r="1.6" />
      </svg>
      星系へ戻る
    </Link>
  );
}
