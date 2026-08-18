"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SPORTS, SPORTS_INTRO, type Sport } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";
import SpaceBackdrop from "@/components/SpaceBackdrop";
import { unlock, useUnlockedFrom } from "@/lib/unlock";

const SprintGame = dynamic(() => import("@/components/games/SprintGame"), { ssr: false });

const SPORT_IDS = SPORTS.map((s) => s.id);

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
      <section className="space relative flex min-h-[calc(100vh-60px)] flex-col justify-center px-5 py-10 text-(--color-white) md:px-14">
        <SpaceBackdrop scenery="desert" />

        <div className="relative mx-auto mb-6 w-full max-w-[1120px]">
          <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-tight">
            身体こそすべて
          </h1>
          <p className="mt-2 max-w-xl text-sm text-(--color-bg-soft)/70">大好きなスポーツ — {SPORTS_INTRO.lead}</p>
        </div>
        <p className="relative mx-auto mb-3 max-w-[1120px] text-sm font-bold text-(--color-accent-light)">
          突破 {cleared.size} / {SPORTS.length}
        </p>

        <div className="relative z-1 mx-auto grid max-w-[1120px] grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {SPORTS.map((s) => {
            const done = cleared.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => onTile(s)}
                className="group relative aspect-4/3 overflow-hidden rounded-md border-2 border-(--color-white)/30 bg-black/40 transition hover:-translate-y-1 hover:border-(--color-accent-light)"
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
