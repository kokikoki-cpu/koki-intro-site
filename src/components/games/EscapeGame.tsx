"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import { sfx } from "@/lib/sfx";
import type { GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * インドの解錠ゲーム: 人間の森を抜けろ。
 *
 * story の「街を歩いているだけで常識が崩れる」「人間の森」をそのまま遊びにした。
 * 3本の路地を人波が迫ってきて、空いている路地へ逃げ続ける。
 *
 * 実装の工夫: 障害物の位置を毎フレーム計算しない。
 * 生成時に「いつ自分の足元に着くか（arriveAt）」を決めて CSS アニメーションで流し、
 * 判定はその時刻に自分がどの路地にいるかだけを見る。**時間で当たりを取る**ので
 * この環境（rAFが止まる）でも判定検証ができ、実機では60fpsで滑らかに流れる。
 *
 * スマホ: 触るのは下の ← → だけ（指被り問題の解決策②）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    /** 何人かわせばクリアか */
    dodges: Math.round(mix(10, 18)),
    /** 人波が迫ってくる時間（短いほど速い） */
    travelMs: Math.round(mix(2600, 1750)),
    /** 出現間隔 */
    spawnMs: Math.round(mix(950, 620)),
    /** 捕まっていい回数 */
    lives: Math.round(mix(2, 1)),
  };
}

type Lane = 0 | 1 | 2;
type Chaser = { id: number; lane: Lane; arriveAt: number; travelMs: number; resolved: boolean };

export default function EscapeGame({
  countryName,
  itemId,
  level,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  countryName: string;
  itemId: string;
  level: Level;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const cfg = tuning(level);
  const mountRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [lane, setLane] = useState<Lane>(1);
  const [dodged, setDodged] = useState(0);
  const [lives, setLives] = useState(cfg.lives);
  const [chasers, setChasers] = useState<Chaser[]>([]);
  const [shake, setShake] = useState(false);

  const laneRef = useRef<Lane>(1);
  const dodgedRef = useRef(0);
  const livesRef = useRef(cfg.lives);
  const chasersRef = useRef<Chaser[]>([]);
  const idRef = useRef(0);
  const lastSpawn = useRef(0);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  const move = useCallback((dir: -1 | 1) => {
    laneRef.current = Math.max(0, Math.min(2, laneRef.current + dir)) as Lane;
    setLane(laneRef.current);
  }, []);

  const start = useCallback(() => {
    stop();
    laneRef.current = 1;
    dodgedRef.current = 0;
    livesRef.current = cfg.lives;
    chasersRef.current = [];
    lastSpawn.current = Date.now();
    setLane(1);
    setDodged(0);
    setLives(cfg.lives);
    setChasers([]);
    setPhase("playing");

    timer.current = window.setInterval(() => {
      const now = Date.now();

      /* 出現。直前と同じ路地ばかりにならないよう完全ランダム
         （3本のうち1本は必ず空く= かわせない配置は生まれない） */
      if (now - lastSpawn.current > cfg.spawnMs) {
        lastSpawn.current = now;
        const c: Chaser = {
          id: ++idRef.current,
          lane: Math.floor(Math.random() * 3) as Lane,
          arriveAt: now + cfg.travelMs,
          travelMs: cfg.travelMs,
          resolved: false,
        };
        chasersRef.current = [...chasersRef.current, c];
        setChasers(chasersRef.current);
      }

      /* 判定は時刻で取る（位置は見ない） */
      for (const c of chasersRef.current) {
        if (c.resolved || now < c.arriveAt) continue;
        c.resolved = true;
        if (c.lane === laneRef.current) {
          sfx("damage");
          setShake(true);
          window.setTimeout(() => setShake(false), 340);
          livesRef.current -= 1;
          setLives(livesRef.current);
          if (livesRef.current < 0) {
            stop();
            setPhase("lost");
            return;
          }
        } else {
          dodgedRef.current += 1;
          setDodged(dodgedRef.current);
          if (dodgedRef.current >= cfg.dodges) {
            stop();
            setPhase("won");
            return;
          }
        }
      }

      /* 流れ終わったものを捨てる */
      const alive = chasersRef.current.filter((c) => now - c.arriveAt < 600);
      if (alive.length !== chasersRef.current.length) {
        chasersRef.current = alive;
        setChasers(alive);
      }
    }, 50);
  }, [cfg.dodges, cfg.lives, cfg.spawnMs, cfg.travelMs, stop]);

  useEffect(() => stop, [stop]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  return (
    <GameShell
      title="人間の森を抜けろ"
      target={countryName}
      rule={
        <>
          人波の来ていない路地へ逃げ続ける。{cfg.dodges}人かわせばクリア。
          <br />
          PC: ←→キー。スマホ: 下のボタン。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            かわした {dodged} / {cfg.dodges}
          </span>
          <span>
            捕まり可 {"●".repeat(Math.max(lives, 0))}
            {"○".repeat(Math.max(cfg.lives - lives, 0))}
          </span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className={`escape ${shake ? "escape--shake" : ""}`}>
          <Image
            src="/images/battle/india.jpg"
            alt=""
            fill
            sizes="620px"
            loading="eager"
            className="escape__bg"
          />
          <div className="escape__scrim" />

          {/* 3本の路地。人波は奥から手前へ落ちてくる */}
          <div className="escape__lanes">
            {[0, 1, 2].map((l) => (
              <div key={l} className="escape__lane">
                {chasers
                  .filter((c) => c.lane === l)
                  .map((c) => (
                    <svg
                      key={c.id}
                      className="escape__chaser"
                      style={{ animationDuration: `${c.travelMs}ms` }}
                      viewBox="0 0 34 44"
                      aria-hidden
                    >
                      {/* 人波。3人ぶんの重なったシルエット */}
                      <circle cx="10" cy="9" r="6" fill="#565a4d" />
                      <rect x="4" y="16" width="12" height="18" rx="6" fill="#565a4d" />
                      <circle cx="24" cy="7" r="6" fill="#3d4a5c" />
                      <rect x="18" y="14" width="12" height="20" rx="6" fill="#3d4a5c" />
                      <circle cx="17" cy="13" r="6.5" fill="#6f5a44" />
                      <rect x="10.5" y="21" width="13" height="20" rx="6.5" fill="#6f5a44" />
                    </svg>
                  ))}
              </div>
            ))}
          </div>

          {/* 自分。本人の顔写真の丸（惑星と同じ言語） */}
          <div className="escape__me" style={{ left: `${lane * 33.333 + 16.666}%` }}>
            <Image src="/images/profile/koki.jpg" alt="" fill sizes="64px" className="object-cover" />
          </div>

          {/* 触るのはここだけ */}
          <div className="escape__cmds">
            <button
              onClick={() => move(-1)}
              disabled={phase !== "playing"}
              className="escape__cmd font-display"
              aria-label="左の路地へ"
              data-track="world-escape-left"
            >
              ←
            </button>
            <button
              onClick={() => move(1)}
              disabled={phase !== "playing"}
              className="escape__cmd font-display"
              aria-label="右の路地へ"
              data-track="world-escape-right"
            >
              →
            </button>
          </div>
        </div>
      }
      onStart={start}
      onRetry={start}
      onClose={() => {
        stop();
        onClose();
      }}
      onReveal={onReveal}
      onUnlockAll={onUnlockAll}
    />
  );
}
