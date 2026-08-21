"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import { sfx } from "@/lib/sfx";
import type { GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * ケニアの解錠ゲーム: 夜のフォトサファリ。
 *
 * 「動物ハント」は**カメラで狩る**。撃つゲームはゲートに既にあるので、
 * こちらは獲物を殺さずに集める（旅人のハントはこっち、という見立てでもある）。
 * 背景は象の群れの実写。その手前をシルエットの動物が横切る。
 *
 * 面白さの芯は**フィルムの節約**。シャッターは押し放題ではなく、
 * 枠に入っていない時に切ると1枚無駄になる。速い獲物を待つか、確実な獲物で
 * 埋めるか、残りフィルムとの相談になる。
 *
 * 操作はシャッター1つだけ（指被り問題の解決策②）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    /** 何枚撮ればクリアか */
    photos: Math.round(mix(3, 6)),
    /** フィルムの枚数（シャッターを切れる回数） */
    film: Math.round(mix(7, 9)),
    /** 動物が横切る時間の範囲（短いほど速い） */
    crossMinMs: mix(3400, 2100),
    crossMaxMs: mix(5200, 3200),
    /** 出現間隔 */
    spawnMs: Math.round(mix(1600, 1050)),
  };
}

/* ファインダーの枠（画面に対する%）。この中に獲物の中心がいれば撮れる */
const FRAME = { left: 36, right: 64, top: 30, bottom: 72 };

type Kind = "elephant" | "giraffe";
type Animal = {
  id: number;
  kind: Kind;
  /** 進行方向。1=左→右 */
  dir: 1 | -1;
  startAt: number;
  crossMs: number;
  /** 縦位置（%） */
  y: number;
};

/** いまの横位置（%）。画面の外(-15)から外(115)へ渡る */
function animalX(a: Animal, now: number): number {
  const p = (now - a.startAt) / a.crossMs;
  const from = a.dir === 1 ? -15 : 115;
  const to = a.dir === 1 ? 115 : -15;
  return from + (to - from) * p;
}

export default function PhotoHuntGame({
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
  const [photos, setPhotos] = useState(0);
  const [film, setFilm] = useState(cfg.film);
  const [animals, setAnimals] = useState<Animal[]>([]);
  const [flash, setFlash] = useState(false);
  const [message, setMessage] = useState("");

  const photosRef = useRef(0);
  const filmRef = useRef(cfg.film);
  const animalsRef = useRef<Animal[]>([]);
  const idRef = useRef(0);
  const lastSpawn = useRef(0);
  const timer = useRef<number | null>(null);

  const stop = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
  }, []);

  const start = useCallback(() => {
    stop();
    photosRef.current = 0;
    filmRef.current = cfg.film;
    animalsRef.current = [];
    lastSpawn.current = 0;
    setPhotos(0);
    setFilm(cfg.film);
    setAnimals([]);
    setMessage("");
    setPhase("playing");

    timer.current = window.setInterval(() => {
      const now = Date.now();
      if (now - lastSpawn.current > cfg.spawnMs) {
        lastSpawn.current = now;
        const a: Animal = {
          id: ++idRef.current,
          kind: Math.random() < 0.6 ? "elephant" : "giraffe",
          dir: Math.random() < 0.5 ? 1 : -1,
          startAt: now,
          crossMs: cfg.crossMinMs + Math.random() * (cfg.crossMaxMs - cfg.crossMinMs),
          y: 38 + Math.random() * 26,
        };
        animalsRef.current = [...animalsRef.current, a];
        setAnimals(animalsRef.current);
      }
      /* 渡りきったものを捨てる */
      const alive = animalsRef.current.filter((a) => now - a.startAt < a.crossMs + 300);
      if (alive.length !== animalsRef.current.length) {
        animalsRef.current = alive;
        setAnimals(alive);
      }
    }, 120);
  }, [cfg.crossMaxMs, cfg.crossMinMs, cfg.film, cfg.spawnMs, stop]);

  useEffect(() => stop, [stop]);

  const shutter = () => {
    if (phase !== "playing" || filmRef.current <= 0) return;
    setFlash(true);
    window.setTimeout(() => setFlash(false), 160);

    filmRef.current -= 1;
    setFilm(filmRef.current);

    /* 位置は時刻から計算する（毎フレームDOMを測らない） */
    const now = Date.now();
    const hit = animalsRef.current.find((a) => {
      const x = animalX(a, now);
      return x > FRAME.left && x < FRAME.right && a.y > FRAME.top && a.y < FRAME.bottom;
    });

    if (hit) {
      sfx("hit");
      setMessage(hit.kind === "elephant" ? "象が撮れた" : "キリンが撮れた");
      photosRef.current += 1;
      setPhotos(photosRef.current);
      /* 撮れた獲物は去る */
      animalsRef.current = animalsRef.current.filter((a) => a.id !== hit.id);
      setAnimals(animalsRef.current);
      if (photosRef.current >= cfg.photos) {
        stop();
        window.setTimeout(() => setPhase("won"), 500);
        return;
      }
    } else {
      sfx("damage");
      setMessage("枠の外。フィルムを無駄にした");
    }

    if (filmRef.current <= 0 && photosRef.current < cfg.photos) {
      stop();
      window.setTimeout(() => setPhase("lost"), 500);
    }
  };

  return (
    <GameShell
      title="夜のフォトサファリ"
      target={countryName}
      rule={
        <>
          獲物が<strong>枠に入った瞬間</strong>にシャッター。{cfg.photos}枚撮ればクリア。
          <br />
          フィルムは{cfg.film}枚だけ。外すと1枚無駄になる。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            撮れた {photos} / {cfg.photos}
          </span>
          <span>フィルム {film}</span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className={`photohunt ${flash ? "photohunt--flash" : ""}`}>
          <Image
            src="/images/battle/kenya.jpg"
            alt=""
            fill
            sizes="620px"
            loading="eager"
            className="photohunt__bg"
          />
          <div className="photohunt__scrim" />

          {/* 横切る獲物。シルエット（地図の生き物と同じ言語） */}
          {animals.map((a) => (
            <svg
              key={a.id}
              className={`photohunt__animal ${a.dir === -1 ? "photohunt__animal--flip" : ""}`}
              style={{ top: `${a.y}%`, animationDuration: `${a.crossMs}ms` }}
              viewBox="0 0 64 44"
              aria-hidden
            >
              {a.kind === "elephant" ? (
                <>
                  <ellipse cx="30" cy="26" rx="18" ry="12" fill="#2f3a30" />
                  <circle cx="49" cy="19" r="8" fill="#2f3a30" />
                  <path d="M55 22 q6 4 4 13 q-4 -2 -6 -8z" fill="#2f3a30" />
                  <rect x="18" y="33" width="5" height="10" fill="#2f3a30" />
                  <rect x="36" y="33" width="5" height="10" fill="#2f3a30" />
                </>
              ) : (
                <>
                  <ellipse cx="26" cy="30" rx="13" ry="8" fill="#5c4a30" />
                  <rect x="35" y="6" width="5" height="26" rx="2.5" fill="#5c4a30" transform="rotate(14 37 19)" />
                  <circle cx="43" cy="7" r="4.4" fill="#5c4a30" />
                  <rect x="18" y="36" width="4" height="8" fill="#5c4a30" />
                  <rect x="31" y="36" width="4" height="8" fill="#5c4a30" />
                </>
              )}
            </svg>
          ))}

          {/* ファインダー。四隅だけの枠（全部囲うと視界が窮屈になる） */}
          <div
            className="photohunt__frame"
            style={{
              left: `${FRAME.left}%`,
              top: `${FRAME.top}%`,
              width: `${FRAME.right - FRAME.left}%`,
              height: `${FRAME.bottom - FRAME.top}%`,
            }}
          />

          {message && <p className="photohunt__msg font-display">{message}</p>}

          {/* 触るのはここだけ */}
          <div className="photohunt__cmds">
            <button
              onClick={shutter}
              disabled={phase !== "playing" || film <= 0}
              className="photohunt__shutter font-display"
              data-track="world-photo-shutter"
            >
              シャッター
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
