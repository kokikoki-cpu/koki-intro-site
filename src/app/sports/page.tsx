"use client";

import { useState } from "react";
import Image from "next/image";
import { SPORTS, SPORTS_INTRO } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";

const PULSES = [
  { top: "10%", left: "8%", size: 60, delay: "0s" },
  { top: "55%", left: "22%", size: 90, delay: "-1.1s" },
  { top: "20%", left: "55%", size: 46, delay: "-2.2s" },
  { top: "65%", left: "70%", size: 70, delay: "-0.5s" },
  { top: "5%", left: "82%", size: 50, delay: "-1.8s" },
];

export default function SportsPage() {
  const [modal, setModal] = useState<ModalData>(null);

  return (
    <>
      <section className="page-hero-photo">
        <Image src="/images/sports/padel.jpg" alt="" fill className="object-cover" sizes="100vw" />
        <div className="page-hero-scrim" />
        <div className="page-hero-ambient" aria-hidden>
          {PULSES.map((p, i) => (
            <span
              key={i}
              className="pulse-dot"
              style={{
                top: p.top,
                left: p.left,
                width: p.size,
                height: p.size,
                background: "radial-gradient(circle, rgba(255,255,255,0.9) 0%, transparent 72%)",
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
        <div className="relative z-3 mx-auto w-full max-w-[1120px] px-5 py-5 md:px-14">
          <h1 className="font-display text-2xl font-extrabold text-(--color-white) md:text-4xl">
            身体こそすべて
          </h1>
          <p className="mt-2 max-w-md text-sm text-(--color-white)/85">
            大好きなスポーツ — {SPORTS_INTRO.lead}
          </p>
        </div>
      </section>

      <section className="px-5 py-6 md:px-14">
        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {SPORTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setModal({ photo: s.photo, title: s.name, body: s.desc })}
              className="group relative aspect-[4/3] overflow-hidden rounded-md border-2 border-(--color-ink) bg-(--color-bg-soft) transition hover:-translate-y-1 hover:border-(--color-accent)"
            >
              <Image
                src={s.photo}
                alt={s.name}
                fill
                className="object-cover transition duration-400 group-hover:scale-[1.08]"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
              <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/82 to-transparent px-4 py-3.5 text-center font-extrabold text-(--color-white)">
                {s.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}
