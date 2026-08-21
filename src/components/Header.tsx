import Link from "next/link";

/**
 * ヘッダーはワードマークだけ。
 * 各ページへの移動はトップの太陽系（惑星を押す）に一本化してあるので、
 * ここにタブを並べると「どこから始めればいいか」が二重になって迷わせる。
 */
export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-(--color-white)/12 bg-(--color-space)/92 text-(--color-white) backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1120px] items-center px-5 py-4 md:px-14">
        <Link href="/" className="font-display text-lg font-bold">
          Who am I <span className="text-(--color-ember)">?</span>
        </Link>
      </div>
    </header>
  );
}
