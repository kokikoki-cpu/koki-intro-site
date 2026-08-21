"use client";

import { useEffect, useRef, useState } from "react";
import GameShell from "./GameShell";
import type { GamePhase } from "./three-kit";

const GOAL = 100;

/** 難易度ごとの調整。時間が短く、1回で進む量が減り、戻される力とハードルが増える */
function tuning(level: number) {
  return {
    timeLimit: (14 - level) * 1000,
    perTap: 3.3 - level * 0.16,
    dragPerSec: 5 + level * 1.3,
    /** ハードルの間隔（m）。狭いほど跳ぶ回数が増える */
    hurdleGap: 26 - level * 3,
  };
}

/** 空中にいる時間 */
const JUMP_MS = 620;
/** ハードルに当たると、この分だけ押し戻される */
const HIT_PENALTY = 9;

export default function SprintGame({
  sportName,
  itemId,
  level,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  sportName: string;
  /** 解錠キー。初回クリア率の表示に使う */
  itemId: string;
  level: 1 | 2 | 3 | 4 | 5;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const { timeLimit: TIME_LIMIT, perTap: PER_TAP, dragPerSec: DRAG, hurdleGap: GAP } = tuning(level);

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [progress, setProgress] = useState(0);
  const [remain, setRemain] = useState(TIME_LIMIT);
  const [leg, setLeg] = useState(0);
  const [air, setAir] = useState(0);
  const [stumbling, setStumbling] = useState(false);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>("intro");
  const progressRef = useRef(0);
  const startedAt = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastTick = useRef(0);
  const legRef = useRef(0);
  const jumpAt = useRef(-1);
  /** 何本目のハードルまで処理したか */
  const clearedHurdles = useRef(0);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /** 0 = 接地, 1 = 最高到達点 */
  const airFactor = (t: number) => {
    if (jumpAt.current < 0) return 0;
    const k = (t - jumpAt.current) / JUMP_MS;
    if (k >= 1) {
      jumpAt.current = -1;
      return 0;
    }
    return Math.sin(k * Math.PI);
  };

  const loop = (t: number) => {
    rafRef.current = requestAnimationFrame(loop);
    if (phaseRef.current !== "playing") return;

    const dt = lastTick.current ? (t - lastTick.current) / 1000 : 0;
    lastTick.current = t;

    progressRef.current = Math.max(0, progressRef.current - DRAG * dt);

    // ハードルを越えたか判定する
    const nextHurdle = (clearedHurdles.current + 1) * GAP;
    if (progressRef.current >= nextHurdle) {
      clearedHurdles.current += 1;
      if (airFactor(t) < 0.25) {
        // 跳べていない → 転んで押し戻される
        progressRef.current = Math.max(0, progressRef.current - HIT_PENALTY);
        setStumbling(true);
        window.setTimeout(() => setStumbling(false), 280);
      }
    }

    setProgress(progressRef.current);
    setAir(airFactor(t));

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
    clearedHurdles.current = 0;
    jumpAt.current = -1;
    setProgress(0);
    setAir(0);
    setRemain(TIME_LIMIT);
    lastTick.current = 0;
    phaseRef.current = "playing";
    setPhase("playing");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame((t) => {
      startedAt.current = t;
      loop(t);
    });
  };

  const run = () => {
    if (phaseRef.current !== "playing") return;
    progressRef.current = Math.min(GOAL, progressRef.current + PER_TAP);
    setProgress(progressRef.current);
    legRef.current = 1 - legRef.current;
    setLeg(legRef.current);

    /* 勝ちはここで見る。ループは「減速 → 判定」の順なので、
       ゴールに触れた次のフレームで割り込んでしまう */
    if (progressRef.current >= GOAL) {
      phaseRef.current = "won";
      setPhase("won");
    }
  };

  const jump = () => {
    if (phaseRef.current !== "playing" || jumpAt.current >= 0) return;
    jumpAt.current = document.timeline.currentTime as number;
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        run();
      }
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Enter") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pct = Math.floor((progress / GOAL) * 100);
  const lift = air * 46;


  // 見えている範囲のハードル
  const hurdles: number[] = [];
  for (let m = GAP; m <= GOAL; m += GAP) {
    const rel = m - progress;
    if (rel > -6 && rel < 62) hurdles.push(rel);
  }

  return (
    <GameShell
      title="走りきれ"
      target={sportName}
      rule={
        <>
          左を連打して走り、右でハードルを跳ぶ。{Math.round(TIME_LIMIT / 1000)}秒以内にゴール。
          <br />
          手を止めると戻され、ハードルに当たると転ぶ。
        </>
      }
      difficulty={level}
      itemId={itemId}
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
          className="relative h-full w-full select-none overflow-hidden"
          style={{
            background:
              "linear-gradient(180deg,#2a3d4f 0%,#5d7f6a 34%,#7fa06a 44%,#c9a877 44%,#b1946f 100%)",
          }}
        >
          {/* 観客席がわりの遠景 */}
          <div
            className="absolute inset-x-0 top-[26%] h-[18%] opacity-50"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#2f4136 0 18px,#3a5142 18px 36px)",
              backgroundPositionX: `${-progress * 2}px`,
            }}
          />

          {/* 走路 */}
          <div
            className="absolute inset-x-0 bottom-0 h-[56%] opacity-45"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg,#fffdf8 0 14px,transparent 14px 78px)",
              backgroundPositionX: `${-progress * 7}px`,
            }}
          />

          {/* ハードル */}
          {hurdles.map((rel, i) => (
            <div
              key={i}
              className="absolute bottom-[17%]"
              style={{ left: `${12 + rel * 1.45}%` }}
            >
              <svg width="30" height="42" viewBox="0 0 30 42" aria-hidden>
                <rect x="2" y="6" width="26" height="5" rx="2" fill="#f4efe2" stroke="#241608" strokeWidth="1.6" />
                <path d="M5 11 L3 40" stroke="#241608" strokeWidth="3" strokeLinecap="round" />
                <path d="M25 11 L27 40" stroke="#241608" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
          ))}

          {/* ゴールテープ */}
          <div
            className="absolute bottom-[10%] top-[22%] w-2 bg-(--color-white)"
            style={{ left: `${12 + (GOAL - progress) * 1.45}%` }}
          />

          {/* 走者 */}
          <div
            className="absolute bottom-[17%] left-[12%]"
            style={{
              transform: `translate(-50%, ${-lift}px) ${stumbling ? "rotate(-14deg)" : ""}`,
            }}
          >
            <svg width="52" height="64" viewBox="0 0 52 64" aria-hidden>
              <circle cx="26" cy="11" r="9" fill="#f0e3cd" stroke="#241608" strokeWidth="2" />
              <rect x="18" y="21" width="16" height="23" rx="7" fill="#3f5c43" stroke="#241608" strokeWidth="2" />
              {air > 0.15 ? (
                <>
                  {/* 跳んでいる間は脚を前後に開く */}
                  <path d="M21 43 L8 34" stroke="#241608" strokeWidth="5" strokeLinecap="round" />
                  <path d="M31 43 L44 50" stroke="#241608" strokeWidth="5" strokeLinecap="round" />
                  <path d="M19 25 L6 18" stroke="#241608" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : (
                <>
                  <path d={leg ? "M21 43 L13 61" : "M21 43 L25 62"} stroke="#241608" strokeWidth="5" strokeLinecap="round" />
                  <path d={leg ? "M31 43 L35 62" : "M31 43 L41 59"} stroke="#241608" strokeWidth="5" strokeLinecap="round" />
                  <path d={leg ? "M19 25 L7 19" : "M19 25 L9 33"} stroke="#241608" strokeWidth="4" strokeLinecap="round" />
                </>
              )}
            </svg>
          </div>

          {/* 進み具合 */}
          <div className="absolute inset-x-4 top-3 h-2 overflow-hidden rounded-full bg-black/45">
            <div
              className="h-full rounded-full bg-(--color-crystal) transition-[width] duration-75"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* 操作は2つのボタンで示す（説明文を置かずに済む） */}
          <div className="absolute inset-x-3 bottom-3 flex gap-3">
            <button
              onPointerDown={run}
              className="flex-1 rounded-lg border-2 border-(--color-white)/70 bg-(--color-ink)/70 py-3 font-display text-lg font-extrabold text-(--color-white) active:bg-(--color-nebula)"
            >
              走る
            </button>
            <button
              onPointerDown={jump}
              className="w-1/3 rounded-lg border-2 border-(--color-crystal) bg-(--color-crystal-deep)/70 py-3 font-display text-lg font-extrabold text-(--color-white) active:bg-(--color-crystal-mid)"
            >
              跳ぶ
            </button>
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
