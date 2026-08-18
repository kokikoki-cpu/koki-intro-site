"use client";

import { useEffect, useRef, useState } from "react";
import GameShell from "./GameShell";
import type { GamePhase } from "./three-kit";

/** 制限時間内にゴールまで走りきる。押した回数がそのまま進む距離 */
const TIME_LIMIT = 10_000;
const GOAL = 100;
/** 1回押すと進む量。押し続けないと戻されるので、連打の速さが要る */
const PER_TAP = 2.6;
/** 毎秒この分だけ後ろへ戻される */
const DRAG_PER_SEC = 9;

export default function SprintGame({
  sportName,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  sportName: string;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [progress, setProgress] = useState(0);
  const [remain, setRemain] = useState(TIME_LIMIT);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>("intro");
  const progressRef = useRef(0);
  const startedAt = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTick = useRef(0);
  const legRef = useRef(0);
  const [leg, setLeg] = useState(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const loop = (t: number) => {
    rafRef.current = requestAnimationFrame(loop);
    if (phaseRef.current !== "playing") return;

    const dt = lastTick.current ? (t - lastTick.current) / 1000 : 0;
    lastTick.current = t;

    // 押していない間はじりじり戻る
    progressRef.current = Math.max(0, progressRef.current - DRAG_PER_SEC * dt);
    setProgress(progressRef.current);

    const left = TIME_LIMIT - (t - startedAt.current);
    setRemain(Math.max(0, left));

    if (progressRef.current >= GOAL) {
      phaseRef.current = "won";
      setPhase("won");
    } else if (left <= 0) {
      phaseRef.current = "lost";
      setPhase("lost");
    }
  };

  const start = () => {
    progressRef.current = 0;
    setProgress(0);
    setRemain(TIME_LIMIT);
    lastTick.current = 0;
    startedAt.current = performance.now();
    phaseRef.current = "playing";
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame((t) => {
      startedAt.current = t;
      loop(t);
    });
  };

  const tap = () => {
    if (phaseRef.current !== "playing") return;
    progressRef.current = Math.min(GOAL, progressRef.current + PER_TAP);
    setProgress(progressRef.current);
    legRef.current = 1 - legRef.current;
    setLeg(legRef.current);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        tap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pct = Math.round((progress / GOAL) * 100);

  return (
    <GameShell
      title="走りきれ"
      target={sportName}
      rule={
        <>
          連打してゴールまで走る。{Math.round(TIME_LIMIT / 1000)}秒以内に走りきれば話が読める。
          <br />
          手を止めるとじりじり戻される。
        </>
      }
      difficulty={3}
      phase={phase}
      hud={
        <>
          <span>{pct} m / 100 m</span>
          <span>残り {(remain / 1000).toFixed(1)}秒</span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div
          ref={mountRef}
          onPointerDown={tap}
          className="relative h-full w-full cursor-pointer select-none overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg,#3f5c43 0%,#6d8560 46%,#c9a877 46%,#b59a76 100%)",
          }}
        >
          {/* 走路のライン。進むほど流れて速さが出る */}
          <div
            className="absolute inset-x-0 bottom-0 h-[54%] opacity-40"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#fffdf8 0 14px,transparent 14px 74px)",
              backgroundPositionX: `${-progress * 6}px`,
            }}
          />

          {/* ゴールテープ */}
          <div
            className="absolute bottom-[8%] top-[18%] w-1.5 bg-(--color-white)"
            style={{ left: `${88 - (progress / GOAL) * 76}%` }}
          />

          {/* 走者 */}
          <div className="absolute bottom-[16%] left-[10%]" style={{ transform: `translateY(${leg ? -6 : 0}px)` }}>
            <svg width="54" height="66" viewBox="0 0 54 66" aria-hidden>
              <circle cx="27" cy="11" r="9" fill="#f0e3cd" stroke="#241608" strokeWidth="2" />
              <rect x="19" y="21" width="16" height="24" rx="7" fill="#3f5c43" stroke="#241608" strokeWidth="2" />
              <path
                d={leg ? "M22 44 L14 62" : "M22 44 L26 63"}
                stroke="#241608"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d={leg ? "M32 44 L36 63" : "M32 44 L42 60"}
                stroke="#241608"
                strokeWidth="5"
                strokeLinecap="round"
              />
              <path
                d={leg ? "M20 26 L8 20" : "M20 26 L10 34"}
                stroke="#241608"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* 進み具合 */}
          <div className="absolute inset-x-4 top-3 h-2 overflow-hidden rounded-full bg-black/45">
            <div
              className="h-full rounded-full bg-(--color-accent-light) transition-[width] duration-75"
              style={{ width: `${pct}%` }}
            />
          </div>
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
