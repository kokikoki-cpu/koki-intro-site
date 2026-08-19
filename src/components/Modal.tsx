"use client";

import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

export type ModalData = {
  photo: string;
  title: string;
  tagline?: string;
  body?: ReactNode;
  /** ゲームをクリアして開いた時だけ true。開封の演出を出す */
  celebrate?: boolean;
} | null;

/** 弾ける粒の向きと飛距離 */
const SPARKS = Array.from({ length: 14 }, (_, i) => ({
  angle: (360 / 14) * i,
  distance: 110 + ((i * 37) % 70),
  color: i % 3 === 0 ? "#ffe0aa" : i % 3 === 1 ? "#85b48d" : "#e8a05c",
  delay: (i % 5) * 40,
}));

export default function Modal({ data, onClose }: { data: ModalData; onClose: () => void }) {
  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative">
        {data.celebrate && (
          <>
            <span className="reveal__flash" />
            {SPARKS.map((s, i) => (
              <span
                key={i}
                className="reveal__spark"
                style={
                  {
                    background: s.color,
                    "--a": `${s.angle}deg`,
                    "--r": `${s.distance}px`,
                    "--d": `${s.delay}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </>
        )}

        <div
          className={`relative max-h-[86vh] w-[min(88vw,28rem)] overflow-y-auto rounded-lg border-2 border-(--color-ink) bg-(--color-white) shadow-[0_8px_24px_rgba(0,0,0,0.18)] ${
            data.celebrate ? "reveal__card" : ""
          }`}
        >
          <button
            onClick={onClose}
            aria-label="閉じる"
            className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg"
          >
            &times;
          </button>
          <div className="relative aspect-4/3 w-full bg-(--color-bg-soft)">
            <Image src={data.photo} alt={data.title} fill className="rounded-t-md object-cover" sizes="460px" />
          </div>
          <div className="p-6 text-center">
            {data.tagline && (
              <p className="mb-2 text-sm font-bold text-(--color-accent-dark)">{data.tagline}</p>
            )}
            <h3 className="font-display text-xl font-bold">{data.title}</h3>
            {data.body && <div className="mt-2 text-sm text-(--color-ink-soft)">{data.body}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
