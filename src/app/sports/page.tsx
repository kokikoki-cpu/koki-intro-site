"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SPORTS, SPORTS_INTRO, type Sport } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";
import { unlock, useUnlockedFrom } from "@/lib/unlock";

const SprintGame = dynamic(() => import("@/components/games/SprintGame"), { ssr: false });

const SPORT_IDS = SPORTS.map((s) => s.id);

const PULSES = [
  { top: "10%", left: "8%", size: 60, delay: "0s" },
  { top: "55%", left: "22%", size: 90, delay: "-1.1s" },
  { top: "20%", left: "55%", size: 46, delay: "-2.2s" },
  { top: "65%", left: "70%", size: 70, delay: "-0.5s" },
  { top: "5%", left: "82%", size: 50, delay: "-1.8s" },
];

export default function SportsPage() {
  const [modal, setModal] = useState<ModalData>(null);
  const [pending, setPending] = useState<Sport | null>(null);
  const cleared = useUnlockedFrom(SPORT_IDS);

  const showSport = (s: Sport) => setModal({ photo: s.photo, title: s.name, body: s.desc });

  const onTile = (s: Sport) => {
    if (cleared.has(s.id)) showSport(s);
    else setPending(s);
  };

  const reveal = () => {
    if (!pending) return;
    unlock(pending.id);
    showSport(pending);
    setPending(null);
  };

  // 合言葉での全解錠は GameShell 側で sessionStorage に反映済み
  const unlockAll = () => {
    if (pending) showSport(pending);
    setPending(null);
  };

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
        <p className="mx-auto mb-3 max-w-[1120px] text-sm font-bold text-(--color-accent-dark)">
          突破 {cleared.size} / {SPORTS.length}
        </p>

        <div className="mx-auto grid max-w-[1120px] grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {SPORTS.map((s) => {
            const done = cleared.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => onTile(s)}
                className="group relative aspect-4/3 overflow-hidden rounded-md border-2 border-(--color-ink) bg-(--color-bg-soft) transition hover:-translate-y-1 hover:border-(--color-accent)"
              >
                <Image
                  src={s.photo}
                  alt={s.name}
                  fill
                  className={`object-cover transition duration-400 group-hover:scale-[1.08] ${
                    done ? "" : "grayscale-[0.85] brightness-[0.72]"
                  }`}
                  sizes="(max-width: 768px) 50vw, 33vw"
                />
                <span className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/82 to-transparent px-4 py-3.5 text-center font-extrabold text-(--color-white)">
                  {s.name}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {pending && (
        <SprintGame
          sportName={pending.name}
          onReveal={reveal}
          onClose={() => setPending(null)}
          onUnlockAll={unlockAll}
        />
      )}

      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}
