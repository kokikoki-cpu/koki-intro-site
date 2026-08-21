"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import { sfx } from "@/lib/sfx";
import type { GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * ペルーの解錠ゲーム: アマゾンの夜釣り。
 *
 * 舞台は本人の記憶（アマゾンの秘境、ピラニア）。背景にはピラニアを持っている
 * 実写を敷く（= 釣った先にある写真、が答え合わせになる）。
 *
 * 面白さの芯は**我慢**:
 *   さざ波（小さな揺れ）で合わせると魚は逃げる。浮きが沈み切った一瞬だけが本物。
 * 「反応が速ければいい」ではなく「見分けてから速い」が要る。
 * FlagsGame の「あげないで」と同じ骨格だが、あちらは指示を読む、こちらは絵を読む。
 *
 * 操作は画面のどこを押しても同じ（指被り問題の解決策③）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    /** 何匹釣ればクリアか */
    catches: Math.round(mix(3, 6)),
    /** 本アタリを合わせられる窓 */
    biteMs: Math.round(mix(900, 480)),
    /** さざ波（偽アタリ）の出る割合 */
    nibbleRate: mix(0.3, 0.5),
    /** 逃していい回数 */
    misses: Math.round(mix(3, 2)),
  };
}

type FloatState = "wait" | "nibble" | "bite" | "catch";

export default function FishingGame({
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
  const [float, setFloat] = useState<FloatState>("wait");
  const [caught, setCaught] = useState(0);
  const [missed, setMissed] = useState(0);
  const [message, setMessage] = useState("");

  const floatRef = useRef<FloatState>("wait");
  const caughtRef = useRef(0);
  const missedRef = useRef(0);
  const timers = useRef<number[]>([]);

  const later = useCallback((fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  }, []);

  const stop = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const setFloatState = useCallback((s: FloatState) => {
    floatRef.current = s;
    setFloat(s);
  }, []);

  const miss = useCallback(
    (text: string) => {
      sfx("damage");
      setMessage(text);
      missedRef.current += 1;
      setMissed(missedRef.current);
      if (missedRef.current > cfg.misses) {
        stop();
        setPhase("lost");
        return false;
      }
      return true;
    },
    [cfg.misses, stop]
  );

  /* 次のアタリを仕込む。自分自身を遅延から呼び直す再帰なので、
     useCallback の依存配列に自分を入れられない = ref 越しに呼ぶ */
  const scheduleRef = useRef<() => void>(() => {});
  const schedule = useCallback(() => {
    setFloatState("wait");
    const delay = 1200 + Math.random() * 2400;
    later(() => {
      if (Math.random() < cfg.nibbleRate) {
        /* さざ波。ここで合わせると逃げられる */
        setFloatState("nibble");
        later(() => {
          if (floatRef.current === "nibble") scheduleRef.current();
        }, 620);
      } else {
        /* 本アタリ。窓の間に合わせる */
        setFloatState("bite");
        later(() => {
          if (floatRef.current !== "bite") return;
          if (miss("見送った。魚は帰った")) scheduleRef.current();
        }, cfg.biteMs);
      }
    }, delay);
  }, [cfg.biteMs, cfg.nibbleRate, later, miss, setFloatState]);

  /* レンダー中に ref へ書くと lint に弾かれるので effect で同期する */
  useEffect(() => {
    scheduleRef.current = schedule;
  }, [schedule]);

  const start = useCallback(() => {
    stop();
    caughtRef.current = 0;
    missedRef.current = 0;
    setCaught(0);
    setMissed(0);
    setMessage("");
    setPhase("playing");
    schedule();
  }, [schedule, stop]);

  useEffect(() => stop, [stop]);

  const strike = () => {
    if (phase !== "playing") return;
    if (floatRef.current === "bite") {
      sfx("hit");
      setFloatState("catch");
      setMessage("かかった！");
      caughtRef.current += 1;
      setCaught(caughtRef.current);
      if (caughtRef.current >= cfg.catches) {
        stop();
        later(() => setPhase("won"), 500);
        return;
      }
      later(() => schedule(), 700);
    } else if (floatRef.current === "nibble") {
      /* さざ波で合わせた = 早合わせ */
      stop();
      if (miss("早合わせ。さざ波は我慢")) schedule();
    } else {
      stop();
      if (miss("何もいない水面を叩いた")) schedule();
    }
  };

  return (
    <GameShell
      title="アマゾンの夜釣り"
      target={countryName}
      rule={
        <>
          浮きが<strong>沈み切った瞬間</strong>だけ画面を叩いて合わせる。{cfg.catches}匹でクリア。
          <br />
          さざ波は我慢。早合わせは逃げられる。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            釣果 {caught} / {cfg.catches}
          </span>
          <span>
            逃し {missed} / {cfg.misses}
          </span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className="fishing" onPointerDown={strike} data-track="world-fishing-strike">
          <Image
            src="/images/battle/peru-piranha.jpg"
            alt=""
            fill
            sizes="620px"
            loading="eager"
            className="fishing__bg"
          />
          <div className="fishing__scrim" />

          {/* 水面。月明かりの帯が浮きの真下に落ちる */}
          <div className="fishing__water">
            <div className={`fishing__float fishing__float--${float}`}>
              <span className="fishing__stick" />
              <span className="fishing__ball" />
            </div>
            {(float === "nibble" || float === "bite") && (
              <span
                className={`fishing__ripple ${float === "bite" ? "fishing__ripple--big" : ""}`}
              />
            )}
            {float === "catch" && (
              /* 釣れた魚。絵文字ではなくシルエット（地図の生き物と同じ言語） */
              <svg className="fishing__fish" viewBox="0 0 40 20" aria-hidden>
                <path d="M4 10 C10 2 24 2 30 10 C24 18 10 18 4 10 Z" fill="#8fa3b8" />
                <path d="M30 10 l7 -6 v12 z" fill="#8fa3b8" />
                <circle cx="10" cy="8.5" r="1.4" fill="#0e1a28" />
              </svg>
            )}
          </div>

          {message && <p className="fishing__msg font-display">{message}</p>}
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
