"use client";

import Image from "next/image";
import type { ReactNode } from "react";

export type ModalData = {
  photo: string;
  title: string;
  tagline?: string;
  body?: ReactNode;
} | null;

export default function Modal({ data, onClose }: { data: ModalData; onClose: () => void }) {
  if (!data) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[86vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-(--color-ink) bg-(--color-white) shadow-[0_8px_24px_rgba(0,0,0,0.18)]">
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg"
        >
          &times;
        </button>
        <div className="relative aspect-[4/3] w-full bg-(--color-bg-soft)">
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
  );
}
