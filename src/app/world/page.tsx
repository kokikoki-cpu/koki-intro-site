"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { COUNTRIES, WORLD_INTRO, type Country } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";
import SpaceBackdrop from "@/components/SpaceBackdrop";
import ReturnToSystem from "@/components/ReturnToSystem";
import { unlock, useUnlockedFrom } from "@/lib/unlock";

/* 国ごとに違うゲームを開く。どれを開くかは data.ts の `game` が持つ。
   9カ国すべて別の体験（気球/流氷/飛行機/釣り/PK/登攀/逃走/サファリ）。
   BattleGame は全カ国が置き換わって未使用（ファイルは残す。data.ts の battle も残る） */
const FlightGame = dynamic(() => import("@/components/games/FlightGame"), { ssr: false });
const BalloonGame = dynamic(() => import("@/components/games/BalloonGame"), { ssr: false });
const IceflowGame = dynamic(() => import("@/components/games/IceflowGame"), { ssr: false });
const FishingGame = dynamic(() => import("@/components/games/FishingGame"), { ssr: false });
const SoccerGame = dynamic(() => import("@/components/games/SoccerGame"), { ssr: false });
const ClimbGame = dynamic(() => import("@/components/games/ClimbGame"), { ssr: false });
const EscapeGame = dynamic(() => import("@/components/games/EscapeGame"), { ssr: false });
const PhotoHuntGame = dynamic(() => import("@/components/games/PhotoHuntGame"), { ssr: false });

const COUNTRY_IDS = COUNTRIES.map((c) => c.id);

/** 地図に散らす生き物。x/y は地図に対する % */
const CRITTERS = [
  { kind: "penguin", x: 46, y: 88, size: 26, label: "南極のペンギン" },
  { kind: "whale", x: 13, y: 52, size: 44, label: "太平洋のクジラ" },
  { kind: "camel", x: 59, y: 36, size: 34, label: "中東のラクダ" },
] as const;

export default function WorldPage() {
  const [modal, setModal] = useState<ModalData>(null);
  const [pending, setPending] = useState<Country | null>(null);
  const [zoom, setZoom] = useState<Country | null>(null);
  const zoomTimer = useRef<number | null>(null);
  const open = useUnlockedFrom(COUNTRY_IDS);

  const showCountry = (c: Country, celebrate = false) =>
    setModal({
      photo: c.photo,
      title: c.name,
      tagline: c.tagline,
      body: c.story,
      celebrate,
      itemId: c.id,
      itemType: "country",
    });

  /* ピンを押したら、その国へ寄ってからゲームを開く（宇宙から降りていく感じ） */
  const onPin = (c: Country) => {
    if (open.has(c.id)) {
      showCountry(c);
      return;
    }
    setZoom(c);
    if (zoomTimer.current) window.clearTimeout(zoomTimer.current);
    zoomTimer.current = window.setTimeout(() => {
      setPending(c);
      setZoom(null);
    }, 900);
  };

  const reveal = () => {
    if (!pending) return;
    unlock(pending.id);
    showCountry(pending, true);
    setPending(null);
  };

  // 合言葉での全解錠は GameShell 側で sessionStorage に反映済み。ここでは中身を見せて閉じるだけ
  const unlockAll = () => {
    if (pending) showCountry(pending);
    setPending(null);
  };

  return (
    <>
      <section className="space relative flex min-h-[calc(100vh-60px)] flex-col justify-center px-5 py-10 text-(--color-white) md:px-14">
        <SpaceBackdrop scenery="sun" />

        <div className="relative mx-auto mb-6 w-full max-w-[1120px]">
          <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-tight">
            あぁ素晴らしき地球
          </h1>
        </div>
        <p className="relative mx-auto mb-3 w-full max-w-[760px] text-sm font-extrabold text-(--color-ember)">
          到達 {open.size} / {COUNTRIES.length}
        </p>
        {/* 地図は「夜空に浮かぶ航路図」。白い紙の上のグレー地図は昼の教材のようで
            ワクワクしない、という指摘で夜に反転した。参考画像（宇宙に浮かぶ光る地図）から
            借りたのは狙いだけで、青のグラデは使わない（パレットは夜空＋ember） */}
        <div
          className="night-map relative mx-auto w-full max-w-[760px] overflow-hidden rounded-lg border-2 border-(--color-ember)/45"
          style={{ aspectRatio: "2752.766 / 1537.631" }}
        >
          <div
            className="absolute inset-0 transition-transform duration-[900ms] ease-[cubic-bezier(0.3,0.8,0.2,1)]"
            style={
              zoom
                ? {
                    transform: `scale(3.2)`,
                    transformOrigin: `${zoom.x}% ${zoom.y}%`,
                  }
                : { transform: "scale(1)" }
            }
          >
          {/* SVG自体は触らず、CSSフィルタで夜にする:
              invert で 白い海→黒 / グレーの大陸→暗い灰 になり、
              sepia + hue-rotate で大陸だけ ember 側の暖色に寄る（黒には色が乗らない） */}
          <Image
            src="/images/world-map.svg"
            alt="世界地図"
            fill
            className="object-fill"
            style={{ filter: "invert(1) sepia(0.55) saturate(1.6) hue-rotate(-12deg) brightness(0.86)" }}
          />
          <div className="absolute inset-0">
            {COUNTRIES.map((c) => {
              const done = open.has(c.id);
              return (
                <button
                  key={c.id}
                  aria-label={c.name}
                  onClick={() => onPin(c)}
                  data-track={`world-pin-${c.id}`}
                  className="group absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-(--color-space) px-2.5 py-1 text-xs font-bold text-(--color-white) opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                    {c.name} {"★".repeat(c.level)}
                  </span>
                  {/* 指で押せるように、見た目を変えずに当たり判定だけ広げる */}
                  <span className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2" />
                  <span
                    className={`block h-4 w-4 rounded-full border-2 transition group-hover:scale-[1.35] ${
                      done
                        ? "border-(--color-white) bg-(--color-ember) shadow-[0_0_14px_rgba(217,168,106,0.85)]"
                        : "animate-pulse border-(--color-white)/60 bg-(--color-white)/15"
                    }`}
                  />
                </button>
              );
            })}

            {/* 遊び心: 地図の余白に生き物を置く */}
            {CRITTERS.map((c) => (
              <span
                key={c.kind}
                aria-label={c.label}
                title={c.label}
                className="critter pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${c.x}%`, top: `${c.y}%`, width: c.size }}
              >
                <Critter kind={c.kind} />
              </span>
            ))}
          </div>
          </div>
        </div>
      </section>

      {pending &&
        (() => {
          const props = {
            countryName: pending.name,
            itemId: pending.id,
            level: pending.level,
            onReveal: reveal,
            onClose: () => setPending(null),
            onUnlockAll: unlockAll,
          };
          switch (pending.game) {
            case "balloon":
              return <BalloonGame {...props} />;
            case "iceflow":
              return <IceflowGame {...props} />;
            case "fishing":
              return <FishingGame {...props} />;
            case "soccer":
              return <SoccerGame {...props} />;
            case "climb":
              return <ClimbGame {...props} />;
            case "escape":
              return <EscapeGame {...props} />;
            case "photo":
              return <PhotoHuntGame {...props} />;
            default:
              /* flight と、万一 game が未設定の国もここで受ける（何も開かないバグを作らない） */
              return <FlightGame {...props} />;
          }
        })()}

      <ReturnToSystem />
      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}

/** 地図に置く生き物のシルエット */
function Critter({ kind }: { kind: "penguin" | "whale" | "camel" }) {
  if (kind === "penguin") {
    return (
      <svg viewBox="0 0 40 56" width="100%" aria-hidden>
        <ellipse cx="20" cy="32" rx="13" ry="20" fill="#3d4a5c" />
        <ellipse cx="20" cy="35" rx="8" ry="15" fill="#f4efe2" />
        <circle cx="20" cy="12" r="10" fill="#3d4a5c" />
        <circle cx="16.5" cy="11" r="1.7" fill="#f4efe2" />
        <circle cx="23.5" cy="11" r="1.7" fill="#f4efe2" />
        <path d="M20 14 l4 3 -4 2.6 -4-2.6z" fill="#e8a05c" />
        <path d="M7 30 q-4 8 1 14 l3-3z" fill="#3d4a5c" />
        <path d="M33 30 q4 8 -1 14 l-3-3z" fill="#3d4a5c" />
        <path d="M14 52 h5 l-2 4 h-6z" fill="#e8a05c" />
        <path d="M26 52 h-5 l2 4 h6z" fill="#e8a05c" />
      </svg>
    );
  }
  if (kind === "whale") {
    return (
      <svg viewBox="0 0 68 34" width="100%" aria-hidden>
        <path
          d="M6 20 C10 8 26 4 40 7 C52 9 58 15 60 20 C58 25 50 29 38 29 C24 29 11 27 6 20 Z"
          fill="#8fa3b8"
        />
        <path d="M60 20 l8-8 v18 z" fill="#8fa3b8" />
        <path d="M22 26 q8 6 18 2 q-9 3 -18 -2z" fill="#e6e2d4" />
        <circle cx="16" cy="17" r="1.8" fill="#f4efe2" />
        {/* 潮吹き */}
        <path d="M22 7 q-2 -6 2 -8" stroke="#9ecfe0" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path d="M27 6 q1 -5 5 -6" stroke="#9ecfe0" strokeWidth="2" fill="none" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 56 46" width="100%" aria-hidden>
      <path
        d="M12 24 q3 -9 10 -9 q3 -7 8 -1 q4 -6 8 1 q7 1 8 9 l-3 2 q-2 -4 -6 -4 l-14 0 q-5 0 -8 4 z"
        fill="#a8794a"
      />
      <path d="M40 15 q6 -2 9 2 l-3 3 q-3 -3 -7 -2z" fill="#a8794a" />
      <path d="M46 14 l6 -4 -1 5 z" fill="#8a5f36" />
      <path d="M15 26 l1 16 h4 l-1 -16z" fill="#8a5f36" />
      <path d="M24 27 l1 15 h4 l-1 -15z" fill="#8a5f36" />
      <path d="M34 27 l1 15 h4 l-1 -15z" fill="#8a5f36" />
      <path d="M41 26 l1 16 h4 l-1 -16z" fill="#8a5f36" />
      <circle cx="48" cy="13" r="1.4" fill="#241608" />
    </svg>
  );
}
