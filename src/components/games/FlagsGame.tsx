"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import GameShell from "./GameShell";
import type { GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * 「赤上げて 白上げて」。反応と我慢を測るゲーム。
 *
 * Three.js を使わない理由: この遊びの中身は**文字を読んで手を動かす**ことだけで、
 * 立体は一切要らない（BattleGame と同じ判断）。
 *
 * 面白さの芯は「あげないで」の引っかけ。押す反応だけを鍛えると必ず引っかかるので、
 * 連打では抜けられない。**押さないことが正解になる指示がある**のがこのゲームの肝。
 *
 * スマホ: 触るのは下の大きな2つの旗だけ。指が読むべき文字に被らない。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    /** 何回連続で正解すればクリアか */
    rounds: Math.round(mix(8, 14)),
    /** 1つの指示に答えるまでの持ち時間 */
    limitMs: Math.round(mix(1700, 850)),
    /** 引っかけ（あげないで）が出る割合 */
    trapRate: mix(0.25, 0.45),
    /** 許容ミス */
    lives: Math.round(mix(3, 1)),
  };
}

type Color = "red" | "white";
type Order = { color: Color; raise: boolean };

const LABEL: Record<Color, string> = { red: "赤", white: "白" };

export default function FlagsGame({
  sportName,
  itemId,
  level,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  sportName: string;
  itemId: string;
  level: Level;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const cfg = tuning(level);
  const mountRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [order, setOrder] = useState<Order | null>(null);
  const [done, setDone] = useState(0);
  const [lives, setLives] = useState(cfg.lives);
  const [flash, setFlash] = useState<"ok" | "ng" | null>(null);
  /** 残り時間の割合（0〜1）。数字ではなくバーで出す */
  const [left, setLeft] = useState(1);

  const doneRef = useRef(0);
  const livesRef = useRef(cfg.lives);
  const orderRef = useRef<Order | null>(null);
  const answeredRef = useRef(false);
  const deadlineRef = useRef(0);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  /** 正解として次へ進む */
  const advance = useCallback(
    (ok: boolean) => {
      setFlash(ok ? "ok" : "ng");
      window.setTimeout(() => setFlash(null), 220);

      if (ok) {
        doneRef.current += 1;
        setDone(doneRef.current);
        if (doneRef.current >= cfg.rounds) {
          stop();
          setPhase("won");
          return;
        }
      } else {
        livesRef.current -= 1;
        setLives(livesRef.current);
        if (livesRef.current <= 0) {
          stop();
          setPhase("lost");
          return;
        }
      }

      /* 次の指示。引っかけを混ぜる */
      const color: Color = Math.random() < 0.5 ? "red" : "white";
      const raise = Math.random() >= cfg.trapRate;
      const next = { color, raise };
      orderRef.current = next;
      setOrder(next);
      answeredRef.current = false;
      deadlineRef.current = Date.now() + cfg.limitMs;
      setLeft(1);
    },
    [cfg.limitMs, cfg.rounds, cfg.trapRate, stop]
  );

  const start = useCallback(() => {
    stop();
    doneRef.current = 0;
    livesRef.current = cfg.lives;
    setDone(0);
    setLives(cfg.lives);
    setPhase("playing");

    const first = { color: "red" as Color, raise: true };
    orderRef.current = first;
    setOrder(first);
    answeredRef.current = false;
    deadlineRef.current = Date.now() + cfg.limitMs;
    setLeft(1);

    timer.current = window.setInterval(() => {
      const rest = deadlineRef.current - Date.now();
      setLeft(Math.max(0, rest / cfg.limitMs));
      if (rest > 0 || answeredRef.current) return;
      answeredRef.current = true;
      /* 時間切れ。「あげないで」なら我慢できたので正解、それ以外は不正解 */
      advance(orderRef.current ? !orderRef.current.raise : false);
    }, 50);
  }, [advance, cfg.lives, cfg.limitMs, stop]);

  useEffect(() => stop, [stop]);

  const tap = (color: Color) => {
    if (phase !== "playing" || answeredRef.current || !orderRef.current) return;
    answeredRef.current = true;
    const o = orderRef.current;
    /* 「あげて」なら同じ色が正解。「あげないで」は押した時点で不正解 */
    advance(o.raise && o.color === color);
  };

  return (
    <GameShell
      title="赤上げて 白上げて"
      target={sportName}
      rule={
        <>
          指示どおりの旗だけ上げる。{cfg.rounds}回連続で正解すればクリア。
          <br />
          <strong>「あげないで」は押さないのが正解。</strong>連打では抜けられない。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            正解 {done} / {cfg.rounds}
          </span>
          <span>
            ミス可 {"●".repeat(Math.max(lives, 0))}
            {"○".repeat(Math.max(cfg.lives - lives, 0))}
          </span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className={`flags ${flash ? `flags--${flash}` : ""}`}>
          {/* 指示。ここが主役なので画面の真ん中で一番大きい */}
          <div className="flags__order">
            {order ? (
              <p className="font-display">
                <span className={order.color === "red" ? "flags__red" : "flags__white"}>
                  {LABEL[order.color]}
                </span>
                <span className="flags__verb">{order.raise ? "あげて" : "あげないで"}</span>
              </p>
            ) : (
              <p className="flags__wait font-display">用意</p>
            )}
          </div>

          {/* 残り時間。数字ではなく減っていく線で見せる */}
          <div className="flags__time">
            <span style={{ width: `${left * 100}%` }} />
          </div>

          {/* 触るのはここだけ */}
          <div className="flags__hands">
            <button
              onClick={() => tap("red")}
              disabled={phase !== "playing"}
              className="flags__flag flags__flag--red font-display"
              data-track="sports-flag-red"
            >
              赤
            </button>
            <button
              onClick={() => tap("white")}
              disabled={phase !== "playing"}
              className="flags__flag flags__flag--white font-display"
              data-track="sports-flag-white"
            >
              白
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
