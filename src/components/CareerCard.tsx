"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { unlock, useIsUnlocked } from "@/lib/unlock";

const CareerRunGame = dynamic(() => import("@/components/games/CareerRunGame"), { ssr: false });

const CAREER_ID = "career";

export default function CareerCard({ steps }: { steps: string[] }) {
  const open = useIsUnlocked(CAREER_ID);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <div className="relative rounded-md border-2 border-(--color-ink) bg-(--color-white) p-[22px] pt-7 md:col-span-2">
        <span className="absolute -top-3.5 left-[22px] rounded-full bg-(--color-accent) px-3.5 py-1 font-display text-sm font-bold text-(--color-white)">
          職歴
        </span>

        {open ? (
          <ul className="m-0 list-none p-0 text-left">
            {steps.map((step, i) => (
              <li
                key={i}
                className="relative ml-1 border-l-2 border-(--color-line) py-1.5 pl-5 text-sm"
              >
                <span className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-(--color-accent)" />
                {step}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <ul className="m-0 list-none p-0 text-left" aria-label="未解錠の職歴">
              {steps.map((_, i) => (
                <li
                  key={i}
                  className="relative ml-1 border-l-2 border-(--color-line) py-1.5 pl-5 text-sm text-(--color-ink-soft)/45"
                >
                  <span className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-(--color-line)" />
                  ？
                </li>
              ))}
            </ul>
            <button
              onClick={() => setPlaying(true)}
              className="mt-4 rounded-full bg-(--color-ink) px-6 py-2.5 text-sm font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
            >
              経歴を駆け抜ける →
            </button>
            <p className="mt-2 text-xs text-(--color-ink-soft)">
              このサイトで一番むずかしい。かすったら即終了。
            </p>
          </>
        )}
      </div>

      {playing && (
        <CareerRunGame
          steps={steps}
          onReveal={() => {
            unlock(CAREER_ID);
            setPlaying(false);
          }}
          onClose={() => setPlaying(false)}
          onUnlockAll={() => setPlaying(false)}
        />
      )}
    </>
  );
}
