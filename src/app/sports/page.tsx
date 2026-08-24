"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { SPORTS, SPORTS_INTRO, type Sport } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";
import SpaceBackdrop from "@/components/SpaceBackdrop";
import ReturnToSystem from "@/components/ReturnToSystem";
import { unlock, useUnlockedFrom } from "@/lib/unlock";

/* 競技ごとに違うゲームを開く。6競技すべてが連打だと飽きる、という指摘への対応。
   どれを開くかは data.ts の `game` が持つ（ここで条件分岐を増やさない） */
const SprintGame = dynamic(() => import("@/components/games/SprintGame"), { ssr: false });
const FlagsGame = dynamic(() => import("@/components/games/FlagsGame"), { ssr: false });
const PairsGame = dynamic(() => import("@/components/games/PairsGame"), { ssr: false });

const SPORT_IDS = SPORTS.map((s) => s.id);

export default function SportsPage() {
  const [modal, setModal] = useState<ModalData>(null);
  const [pending, setPending] = useState<Sport | null>(null);
  const cleared = useUnlockedFrom(SPORT_IDS);

  const showSport = (s: Sport, celebrate = false) =>
    setModal({ photo: s.photo, title: s.name, body: s.desc, celebrate });

  const onTile = (s: Sport) => {
    if (cleared.has(s.id)) showSport(s);
    else setPending(s);
  };

  const reveal = () => {
    if (!pending) return;
    unlock(pending.id);
    showSport(pending, true);
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
            スポーツの惑星
          </h1>
        </div>
        <p className="relative mx-auto mb-3 w-full max-w-[1120px] text-sm font-bold text-(--color-ember)">
          突破 {cleared.size} / {SPORTS.length}
        </p>

        <div className="relative z-1 mx-auto grid w-full max-w-[1120px] grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {SPORTS.map((s) => {
            const done = cleared.has(s.id);
            return (
              <button
                key={s.id}
                onClick={() => onTile(s)}
                data-track={`sports-tile-${s.id}`}
                className="group flex flex-col items-center gap-2 transition hover:-translate-y-1.5"
              >
                {/* 競技はそれぞれ小さな惑星。未突破は雲に隠れて見えない */}
                <span className="asteroid relative block aspect-square w-full overflow-hidden rounded-full border-2 border-(--color-ember)/60">
                  <Image
                    src={s.photo}
                    alt={done ? s.name : "未突破"}
                    fill
                    className={`object-cover transition duration-400 group-hover:scale-[1.1] ${
                      done ? "" : "scale-110 grayscale brightness-[0.45] blur-lg"
                    }`}
                    sizes="(max-width: 768px) 45vw, 30vw"
                  />
                  {!done && (
                    <span className="absolute inset-0 flex items-center justify-center font-display text-5xl font-extrabold text-(--color-white)/70">
                      ?
                    </span>
                  )}
                </span>

                <span className="text-center font-display text-sm font-extrabold text-(--color-white) md:text-base">
                  {done ? s.name : "？？？"}
                </span>
                <span className="text-xs tracking-[0.2em] text-(--color-ember)">
                  {"★".repeat(s.level)}
                  <span className="text-(--color-white)/25">{"★".repeat(5 - s.level)}</span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {pending &&
        (() => {
          /* 競技名は伏せたまま（ポケモン図鑑方式）。クリアして初めて正体が出る */
          const props = {
            sportName: "？？？",
            itemId: pending.id,
            level: pending.level,
            onReveal: reveal,
            onClose: () => setPending(null),
            onUnlockAll: unlockAll,
          };
          if (pending.game === "flags") return <FlagsGame {...props} />;
          if (pending.game === "pairs") return <PairsGame {...props} />;
          return <SprintGame {...props} />;
        })()}

      <ReturnToSystem />
      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}
