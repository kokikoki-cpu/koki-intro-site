"use client";

import { useState } from "react";
import Image from "next/image";
import { COUNTRIES, WORLD_INTRO } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";

export default function WorldPage() {
  const [modal, setModal] = useState<ModalData>(null);

  return (
    <>
      <section className="page-hero-photo">
        <Image
          src="/images/countries/turkey.jpg"
          alt=""
          fill
          className="object-cover"
          sizes="100vw"
        />
        <div className="page-hero-scrim" />
        <div className="page-hero-ambient" aria-hidden>
          <svg className="globe-layer" viewBox="0 0 400 400">
            <circle className="globe-outline" cx="200" cy="200" r="188" />
            <ellipse className="globe-line" cx="200" cy="200" rx="188" ry="130" />
            <ellipse className="globe-line" cx="200" cy="200" rx="188" ry="66" />
            <ellipse className="meridian" cx="200" cy="200" rx="188" ry="188" />
            <ellipse className="meridian" cx="200" cy="200" rx="188" ry="188" />
            <ellipse className="meridian" cx="200" cy="200" rx="188" ry="188" />
            <ellipse className="meridian" cx="200" cy="200" rx="188" ry="188" />
          </svg>
        </div>
        <div className="relative z-3 mx-auto w-full max-w-[1120px] px-5 py-5 md:px-14">
          <h1 className="font-display text-2xl font-extrabold text-(--color-white) md:text-4xl">
            あぁ素晴らしき地球
          </h1>
          <p className="mt-2 max-w-md text-sm text-(--color-white)/85">
            {WORLD_INTRO.lead}（{WORLD_INTRO.sub}）
          </p>
        </div>
      </section>

      <section className="px-5 py-6 md:px-14">
        <div
          className="relative mx-auto w-full max-w-[760px] overflow-hidden rounded-lg border-2 border-(--color-ink) bg-(--color-bg-soft)"
          style={{ aspectRatio: "2752.766 / 1537.631" }}
        >
          <Image
            src="/images/world-map.svg"
            alt="世界地図"
            fill
            className="object-fill"
            style={{ filter: "sepia(12%) saturate(85%) brightness(0.97)" }}
          />
          <div className="absolute inset-0">
            {COUNTRIES.map((c) => (
              <button
                key={c.id}
                aria-label={c.name}
                onClick={() => setModal({ photo: c.photo, title: c.name, tagline: c.tagline, body: c.story })}
                className="group absolute -translate-x-1/2 -translate-y-full"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-(--color-ink) px-2.5 py-1 text-xs font-bold text-(--color-white) opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  {c.name}
                </span>
                <span className="block h-4 w-4 animate-pulse rounded-full border-2 border-(--color-white) bg-(--color-clay) shadow-[0_3px_8px_rgba(0,0,0,0.3)] transition group-hover:scale-[1.35]" />
              </button>
            ))}
          </div>
        </div>
      </section>

      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}
