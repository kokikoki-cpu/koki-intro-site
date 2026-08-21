"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import { sfx } from "@/lib/sfx";
import type { GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * ブラジルの解錠ゲーム: 夜のPK戦。
 *
 * 面白さの芯は**読み合い**。キーパーはこちらの癖を覚えていて、
 * **同じコースを続けると読まれる**（確率が上がる）。連打でも反射でもなく、
 * 「相手がどう考えるか」を考えるゲーム。バトルを外した後も、
 * 世界地図に1つは頭脳系を残すための設計。
 *
 * スマホ: 触るのは下の3つのコースだけ（指被り問題の解決策②）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    /** 何点取ればクリアか */
    goals: Math.round(mix(3, 5)),
    /** 蹴れる本数 */
    shots: Math.round(mix(6, 7)),
    /** キーパーの基本の読み（コースを当てる確率） */
    read: mix(0.22, 0.34),
    /** 同じコースを続けたときに読まれる確率 */
    readRepeat: mix(0.55, 0.8),
  };
}

type Lane = 0 | 1 | 2;
const LANES: Lane[] = [0, 1, 2];
const LANE_LABEL = ["左", "真ん中", "右"] as const;

export default function SoccerGame({
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
  const [goals, setGoals] = useState(0);
  const [shot, setShot] = useState(0);
  /** 蹴った球とキーパーの動き。null は構え */
  const [ballLane, setBallLane] = useState<Lane | null>(null);
  const [diveLane, setDiveLane] = useState<Lane | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const goalsRef = useRef(0);
  const shotRef = useRef(0);
  const lastKickRef = useRef<Lane | null>(null);
  const busyRef = useRef(false);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);
  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const start = useCallback(() => {
    stop();
    goalsRef.current = 0;
    shotRef.current = 0;
    lastKickRef.current = null;
    busyRef.current = false;
    setBusy(false);
    setGoals(0);
    setShot(0);
    setBallLane(null);
    setDiveLane(null);
    setMessage("");
    setPhase("playing");
  }, [stop]);

  useEffect(() => stop, [stop]);

  /* useCallback で包むのは lint 対策も兼ねる（BattleGame の choose と同じ理由）:
     本体に直接書くと中の Math.random() がレンダー中の不純呼び出しとして弾かれる */
  const kick = useCallback((lane: Lane) => {
    if (phase !== "playing" || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    /* キーパーの頭の中: 同じコースの連投は読む。それ以外は基本の読み */
    const repeated = lastKickRef.current === lane;
    const readP = repeated ? cfg.readRepeat : cfg.read;
    const dive: Lane =
      Math.random() < readP ? lane : LANES.filter((l) => l !== lane)[Math.random() < 0.5 ? 0 : 1];
    lastKickRef.current = lane;

    setBallLane(lane);
    /* キーパーはボールより一拍あとに跳ぶ（同時だと読まれた感が出ない） */
    later(() => setDiveLane(dive), 140);

    later(() => {
      shotRef.current += 1;
      setShot(shotRef.current);
      const scored = dive !== lane;
      if (scored) {
        sfx("hit");
        goalsRef.current += 1;
        setGoals(goalsRef.current);
        setMessage(repeated ? "読まれなかった" : "決めた");
      } else {
        sfx("damage");
        setMessage(repeated ? "同じコースは読まれる" : "止められた");
      }

      if (goalsRef.current >= cfg.goals) {
        stop();
        later(() => setPhase("won"), 600);
        return;
      }
      /* 残り全部決めても届かないなら終了 */
      if (goalsRef.current + (cfg.shots - shotRef.current) < cfg.goals) {
        stop();
        later(() => setPhase("lost"), 600);
        return;
      }

      later(() => {
        setBallLane(null);
        setDiveLane(null);
        busyRef.current = false;
        setBusy(false);
      }, 800);
    }, 620);
  }, [cfg.goals, cfg.read, cfg.readRepeat, cfg.shots, later, phase, stop]);

  return (
    <GameShell
      title="夜のPK戦"
      target={countryName}
      rule={
        <>
          コースを選んで蹴る。{cfg.shots}本のうち{cfg.goals}本決めればクリア。
          <br />
          <strong>同じコースを続けると読まれる。</strong>キーパーとの読み合い。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            得点 {goals} / {cfg.goals}
          </span>
          <span>
            残り {cfg.shots - shot} 本
          </span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className="soccer">
          <Image
            /* brazil.jpg はキリスト像との自撮りで、顔がゴール裏に大きく出て競合した
               （自撮りは背景に向かない、のバトルで得た教訓と同じ）。
               こちらは夜のビーチの群衆 = 暗く沈めると「ゴール裏の観客」に読める */
            src="/images/battle/brazil-2.jpg"
            alt=""
            fill
            sizes="620px"
            loading="eager"
            className="soccer__bg"
          />
          <div className="soccer__scrim" />

          {/* ゴール。白い枠線だけで描く（照明に照らされた夜のゴール） */}
          <div className="soccer__goal">
            {/* キーパー。シルエットで、選んだコースへ跳ぶ */}
            <svg
              className={`soccer__keeper ${
                diveLane !== null ? `soccer__keeper--dive${diveLane}` : ""
              }`}
              viewBox="0 0 40 52"
              aria-hidden
            >
              <circle cx="20" cy="9" r="7" fill="#8fa3b8" />
              <rect x="13" y="17" width="14" height="22" rx="6" fill="#8fa3b8" />
              <rect x="4" y="18" width="10" height="5" rx="2.5" fill="#8fa3b8" />
              <rect x="26" y="18" width="10" height="5" rx="2.5" fill="#8fa3b8" />
              <rect x="14" y="39" width="5" height="12" rx="2.5" fill="#8fa3b8" />
              <rect x="21" y="39" width="5" height="12" rx="2.5" fill="#8fa3b8" />
            </svg>
          </div>

          {/* ボール。構えでは足元、蹴るとコースへ飛ぶ */}
          <span
            className={`soccer__ball ${ballLane !== null ? `soccer__ball--fly${ballLane}` : ""}`}
          />

          {message && <p className="soccer__msg font-display">{message}</p>}

          {/* 触るのはここだけ */}
          <div className="soccer__cmds">
            {LANES.map((l) => (
              <button
                key={l}
                onClick={() => kick(l)}
                disabled={phase !== "playing" || busy}
                className="soccer__cmd font-display"
                data-track={`world-soccer-kick-${l}`}
              >
                {LANE_LABEL[l]}
              </button>
            ))}
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
