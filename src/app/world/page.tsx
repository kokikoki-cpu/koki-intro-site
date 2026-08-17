"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import { COUNTRIES, WORLD_INTRO, type Country } from "@/lib/data";
import Modal, { type ModalData } from "@/components/Modal";
import { unlock, useUnlockedFrom } from "@/lib/unlock";

const FlightGame = dynamic(() => import("@/components/games/FlightGame"), { ssr: false });

const COUNTRY_IDS = COUNTRIES.map((c) => c.id);

export default function WorldPage() {
  const [modal, setModal] = useState<ModalData>(null);
  const [pending, setPending] = useState<Country | null>(null);
  const open = useUnlockedFrom(COUNTRY_IDS);

  const showCountry = (c: Country) =>
    setModal({ photo: c.photo, title: c.name, tagline: c.tagline, body: c.story });

  const onPin = (c: Country) => {
    if (open.has(c.id)) showCountry(c);
    else setPending(c);
  };

  const reveal = () => {
    if (!pending) return;
    unlock(pending.id);
    showCountry(pending);
    setPending(null);
  };

  // 合言葉での全解錠は GameShell 側で sessionStorage に反映済み。ここでは中身を見せて閉じるだけ
  const unlockAll = () => {
    if (pending) showCountry(pending);
    setPending(null);
  };

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
        <p className="mx-auto mb-3 max-w-[760px] text-sm text-(--color-ink-soft)">
          ピンを押すとその国へのフライトが始まる。無事たどり着けたら旅の話が読める。
          <span className="ml-2 font-bold text-(--color-accent-dark)">
            到達 {open.size} / {COUNTRIES.length}
          </span>
        </p>
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
            {COUNTRIES.map((c) => {
              const done = open.has(c.id);
              return (
                <button
                  key={c.id}
                  aria-label={c.name}
                  onClick={() => onPin(c)}
                  className="group absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-full bg-(--color-ink) px-2.5 py-1 text-xs font-bold text-(--color-white) opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                    {c.name}
                    {!done && " — 未到達"}
                  </span>
                  {/* 指で押せるように、見た目を変えずに当たり判定だけ広げる */}
                  <span className="absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2" />
                  <span
                    className={`block h-4 w-4 rounded-full border-2 border-(--color-white) shadow-[0_3px_8px_rgba(0,0,0,0.3)] transition group-hover:scale-[1.35] ${
                      done ? "bg-(--color-accent)" : "animate-pulse bg-(--color-clay)"
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {pending && (
        <FlightGame
          countryName={pending.name}
          onReveal={reveal}
          onClose={() => setPending(null)}
          onUnlockAll={unlockAll}
        />
      )}

      <Modal data={modal} onClose={() => setModal(null)} />
    </>
  );
}
