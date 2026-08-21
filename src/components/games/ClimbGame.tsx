"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import { sfx } from "@/lib/sfx";
import type { GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * アルゼンチンの解錠ゲーム: パタゴニアの夜明け登攀。
 *
 * 背景はパタゴニアの実写。登るほど写真が下に流れて「高度が上がる」を絵で見せる。
 *
 * 面白さの芯は**呼吸を合わせる**こと。振り子（体の重心）が左右に揺れていて、
 * emberの帯（次のホールド）に入った瞬間に掴む。掴むたびに揺れが速くなる＝
 * 高くなるほど風が強い。連打すると帯の外で掴んで滑落する。
 *
 * 操作は画面のどこを押しても同じ（指被り問題の解決策③）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    /** 掴むホールドの数 */
    holds: Math.round(mix(5, 9)),
    /** 振り子の周期（ms）。登るごとに縮む */
    periodMs: mix(1700, 1200),
    /** 1ホールドごとに周期が縮む倍率 */
    accel: mix(0.97, 0.93),
    /** emberの帯の幅（振り子の振れ幅に対する割合） */
    zone: mix(0.3, 0.17),
    /** 滑落していい回数 */
    slips: Math.round(mix(2, 1)),
  };
}

export default function ClimbGame({
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
  const [holds, setHolds] = useState(0);
  const [slips, setSlips] = useState(0);
  /** 振り子の位置（-1〜1）と帯の中心。30fpsで十分（バーの表示なので） */
  const [pos, setPos] = useState(0);
  const [zoneCenter, setZoneCenter] = useState(0);
  const [shake, setShake] = useState(false);

  const holdsRef = useRef(0);
  const slipsRef = useRef(0);
  const posRef = useRef(0);
  const zoneRef = useRef(0);
  const periodRef = useRef(cfg.periodMs);
  const t0 = useRef(0);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  const newZone = useCallback(() => {
    /* 帯は端に寄りすぎない範囲でランダムに置く（端だと振り子が一瞬しか通らない） */
    const c = (Math.random() * 2 - 1) * 0.6;
    zoneRef.current = c;
    setZoneCenter(c);
  }, []);

  const start = useCallback(() => {
    stop();
    holdsRef.current = 0;
    slipsRef.current = 0;
    periodRef.current = cfg.periodMs;
    t0.current = Date.now();
    setHolds(0);
    setSlips(0);
    newZone();
    setPhase("playing");

    timer.current = window.setInterval(() => {
      const p = Math.sin(((Date.now() - t0.current) / periodRef.current) * Math.PI * 2);
      posRef.current = p;
      setPos(p);
    }, 33);
  }, [cfg.periodMs, newZone, stop]);

  useEffect(() => stop, [stop]);

  const grab = () => {
    if (phase !== "playing") return;
    if (Math.abs(posRef.current - zoneRef.current) <= cfg.zone) {
      sfx("hit");
      holdsRef.current += 1;
      setHolds(holdsRef.current);
      if (holdsRef.current >= cfg.holds) {
        stop();
        setPhase("won");
        return;
      }
      /* 登るほど風が強い。周期を縮めて、次の帯を引き直す */
      periodRef.current *= cfg.accel;
      t0.current = Date.now();
      newZone();
    } else {
      sfx("damage");
      setShake(true);
      window.setTimeout(() => setShake(false), 340);
      slipsRef.current += 1;
      setSlips(slipsRef.current);
      if (slipsRef.current > cfg.slips) {
        stop();
        setPhase("lost");
      }
    }
  };

  /* 登った割合。背景写真をこの分だけ下へ流す（＝自分が上がって見える） */
  const climbed = holds / cfg.holds;

  return (
    <GameShell
      title="夜明けの登攀"
      target={countryName}
      rule={
        <>
          揺れる印が<strong>emberの帯に入った瞬間</strong>に画面を叩いて掴む。
          {cfg.holds}回でクリア。
          <br />
          登るほど風で揺れが速くなる。帯の外で掴むと滑落。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            高度 {holds} / {cfg.holds}
          </span>
          <span>
            滑落可 {"●".repeat(Math.max(cfg.slips - slips, 0))}
            {"○".repeat(Math.min(slips, cfg.slips))}
          </span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className={`climb ${shake ? "climb--shake" : ""}`} onPointerDown={grab} data-track="world-climb-grab">
          {/* 山の実写。登った分だけ下へ流す */}
          <div
            className="climb__scene"
            style={{ transform: `translateY(${climbed * 18}%)` }}
          >
            <Image
              src="/images/battle/argentina-patagonia.jpg"
              alt=""
              fill
              sizes="620px"
              loading="eager"
              className="climb__bg"
            />
          </div>
          <div className="climb__scrim" />

          {/* 自分。岩壁に取りついている小さな灯 */}
          <span className="climb__me" style={{ bottom: `${26 + climbed * 46}%` }} />

          {/* 振り子と帯。ここを読むのがゲームの全部なので、下部で大きく */}
          <div className="climb__meter">
            <span
              className="climb__zone"
              style={{
                left: `${((zoneCenter - cfg.zone + 1) / 2) * 100}%`,
                width: `${cfg.zone * 100}%`,
              }}
            />
            <span className="climb__marker" style={{ left: `${((pos + 1) / 2) * 100}%` }} />
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
