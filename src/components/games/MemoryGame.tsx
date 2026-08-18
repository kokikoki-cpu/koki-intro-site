"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import type { GamePhase } from "./three-kit";

/** 光る順番を覚えて、同じ順に押し返す。回を追うごとに1つ長くなる */
const ROUNDS = 4;
const START_LENGTH = 3;
/** 1つ光る時間 */
const FLASH_MS = 620;

type Cell = { photo: string; label: string };

export default function MemoryGame({
  personName,
  cells,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  personName: string;
  cells: Cell[];
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [round, setRound] = useState(0);
  const [sequence, setSequence] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [showing, setShowing] = useState(false);
  const [step, setStep] = useState(0);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const timers = useRef<number[]>([]);

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  /** 手本を順番に光らせる */
  const showSequence = (seq: number[]) => {
    clearTimers();
    setShowing(true);
    setStep(0);
    seq.forEach((cell, i) => {
      timers.current.push(
        window.setTimeout(() => setLit(cell), i * FLASH_MS + 400)
      );
      timers.current.push(
        window.setTimeout(() => setLit(null), i * FLASH_MS + 400 + FLASH_MS * 0.6)
      );
    });
    timers.current.push(
      window.setTimeout(() => setShowing(false), seq.length * FLASH_MS + 400)
    );
  };

  const startRound = (n: number) => {
    const len = START_LENGTH + n;
    const seq = Array.from({ length: len }, () => Math.floor(Math.random() * cells.length));
    setSequence(seq);
    setRound(n);
    showSequence(seq);
  };

  const start = () => {
    setPhase("playing");
    startRound(0);
  };

  const press = (i: number) => {
    if (phase !== "playing" || showing) return;

    if (sequence[step] !== i) {
      clearTimers();
      setPhase("lost");
      return;
    }

    // 押した手応えとして一瞬光らせる
    setLit(i);
    timers.current.push(window.setTimeout(() => setLit(null), 180));

    const next = step + 1;
    if (next < sequence.length) {
      setStep(next);
      return;
    }

    // この回はクリア
    if (round + 1 >= ROUNDS) {
      setPhase("won");
      return;
    }
    timers.current.push(window.setTimeout(() => startRound(round + 1), 700));
  };

  return (
    <GameShell
      title="顔を覚えろ"
      target={personName}
      rule={
        <>
          光った順番どおりに押し返す。{ROUNDS}回続けば正体が分かる。
          <br />
          1回ごとに順番が1つ増える。
        </>
      }
      difficulty={2}
      phase={phase}
      hud={
        <>
          <span>
            {round + 1} / {ROUNDS} 回目
          </span>
          <span className={showing ? "text-(--color-clay)" : "text-(--color-accent-light)"}>
            {showing ? "見て覚える" : "押す番"}
          </span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div
          ref={mountRef}
          className="grid h-full w-full grid-cols-3 grid-rows-2 gap-2 bg-(--color-ink) p-2"
        >
          {cells.map((c, i) => (
            <button
              key={i}
              onClick={() => press(i)}
              disabled={showing || phase !== "playing"}
              aria-label={c.label}
              className={`relative overflow-hidden rounded-md border-2 transition ${
                lit === i
                  ? "scale-[1.04] border-(--color-accent-light) brightness-150"
                  : "border-(--color-white)/20 brightness-[0.45]"
              } ${showing ? "cursor-default" : "cursor-pointer"}`}
            >
              <Image src={c.photo} alt="" fill sizes="180px" className="object-cover" />
            </button>
          ))}
        </div>
      }
      onStart={start}
      onRetry={start}
      onClose={onClose}
      onReveal={onReveal}
      onUnlockAll={onUnlockAll}
    />
  );
}
