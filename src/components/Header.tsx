"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Who am I ?" },
  { href: "/world", label: "あぁ素晴らしき地球" },
  { href: "/people", label: "世界のクセ強人類" },
  { href: "/sports", label: "身体こそすべて" },
];

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-(--color-white)/12 bg-(--color-ink)/92 text-(--color-white) backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between px-5 py-4 md:px-14">
        <Link href="/" className="font-display text-lg font-bold">
          Who am I <span className="text-(--color-accent-light)">?</span>
        </Link>
        <button
          className="flex flex-col gap-1.5 p-1.5 md:hidden"
          aria-label="メニュー"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="block h-0.5 w-6 bg-(--color-white)" />
          <span className="block h-0.5 w-6 bg-(--color-white)" />
          <span className="block h-0.5 w-6 bg-(--color-white)" />
        </button>
        <nav className="hidden gap-6 md:flex lg:gap-9">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`relative py-1 text-sm font-semibold after:absolute after:-bottom-0.5 after:left-0 after:right-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-(--color-accent-light) after:transition-transform after:content-[''] hover:after:scale-x-100 ${
                pathname === item.href ? "after:scale-x-100" : ""
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      {open && (
        <nav className="flex flex-col border-t border-(--color-white)/12 bg-(--color-ink) md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="border-t border-(--color-white)/12 px-5 py-3.5 text-sm font-semibold first:border-t-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
