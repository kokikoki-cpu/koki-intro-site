"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import GameShell from "./GameShell";
import type { GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * 神経衰弱。同じ写真を2枚めくって揃える。
 *
 * 揃える絵柄には**旅とスポーツの実写**を使う。トランプの数字にすると、このサイトで
 * わざわざ遊ぶ理由が無くなる（記憶しているうちに写真を覚える、が狙い）。
 *
 * 人図鑑の `MemoryGame` とは別物。あちらは「光った順を覚えて押し返す」（順序の記憶）、
 * こちらは「どこに何があったかを覚える」（位置の記憶）。指摘どおり質が違う。
 *
 * スマホ: 押すのは札そのもの。指が札に被るのは当たり前なので問題にならない
 * （動かす対象を指で隠す、という指被り問題とは別）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    /** 組の数。2倍が札の枚数 */
    pairs: Math.round(mix(3, 8)),
    /** 外していい回数 */
    misses: Math.round(mix(6, 4)),
    /** 外した札を見せている時間 */
    peekMs: Math.round(mix(900, 520)),
  };
}

type Card = { id: number; photo: string; open: boolean; taken: boolean };

/** 札の絵。旅とスポーツの実写から取る */
const FACES = [
  "/images/sports/tennis.jpg",
  "/images/sports/padel.jpg",
  "/images/sports/futsal.jpg",
  "/images/sports/marathon.jpg",
  "/images/sports/ultimate.jpg",
  "/images/sports/tabletennis.jpg",
  "/images/countries/turkey.jpg",
  "/images/countries/namibia.jpg",
];

export default function PairsGame({
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
  /* 挑戦前の画面から裏向きの札を並べておく（何をするゲームか絵で分かる）。
     effect で後から setState すると「連鎖レンダー」として lint に弾かれるので、
     最初の状態としてここで作る */
  const [cards, setCards] = useState<Card[]>(() => {
    const faces = FACES.slice(0, tuning(level).pairs);
    return [...faces, ...faces].map((photo, i) => ({
      id: i,
      photo,
      open: false,
      taken: false,
    }));
  });
  const [taken, setTaken] = useState(0);
  const [missed, setMissed] = useState(0);

  const busy = useRef(false);
  const firstRef = useRef<number | null>(null);
  const missedRef = useRef(0);
  const takenRef = useRef(0);

  const start = useCallback(() => {
    const faces = FACES.slice(0, cfg.pairs);
    const deck: Card[] = [...faces, ...faces].map((photo, i) => ({
      id: i,
      photo,
      open: false,
      taken: false,
    }));
    /* 混ぜる。ここは毎回違っていい（配置を覚えるゲームなので固定したら成立しない） */
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setCards(deck);
    setTaken(0);
    setMissed(0);
    takenRef.current = 0;
    missedRef.current = 0;
    firstRef.current = null;
    busy.current = false;
    setPhase("playing");
  }, [cfg.pairs]);

  const flip = (idx: number) => {
    if (phase !== "playing" || busy.current) return;
    setCards((prev) => {
      const c = prev[idx];
      if (!c || c.open || c.taken) return prev;
      const next = prev.map((x, i) => (i === idx ? { ...x, open: true } : x));

      if (firstRef.current === null) {
        firstRef.current = idx;
        return next;
      }

      const a = next[firstRef.current];
      const b = next[idx];
      firstRef.current = null;

      if (a.photo === b.photo) {
        /* 揃った */
        takenRef.current += 1;
        setTaken(takenRef.current);
        if (takenRef.current >= cfg.pairs) {
          window.setTimeout(() => setPhase("won"), 260);
        }
        return next.map((x) => (x.photo === a.photo ? { ...x, taken: true, open: true } : x));
      }

      /* 外した。少し見せてから伏せる（覚える時間がないと記憶ゲームにならない） */
      busy.current = true;
      missedRef.current += 1;
      setMissed(missedRef.current);
      window.setTimeout(() => {
        setCards((cur) => cur.map((x) => (x.taken ? x : { ...x, open: false })));
        busy.current = false;
        if (missedRef.current > cfg.misses) setPhase("lost");
      }, cfg.peekMs);
      return next;
    });
  };

  /* 札の並び。組の数に応じて列を変える（3組=3列、8組=4列） */
  const cols = cfg.pairs <= 3 ? 3 : cfg.pairs <= 6 ? 4 : 4;

  return (
    <GameShell
      title="神経衰弱"
      target={sportName}
      rule={
        <>
          同じ写真を2枚めくって揃える。{cfg.pairs}組すべて揃えればクリア。
          <br />
          外せるのは{cfg.misses}回まで。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            揃った {taken} / {cfg.pairs}
          </span>
          <span>
            外し {missed} / {cfg.misses}
          </span>
        </>
      }
      mountRef={mountRef}
      canvas={
        <div className="pairs" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {cards.map((c, i) => (
            <button
              key={c.id}
              onClick={() => flip(i)}
              disabled={phase !== "playing" || c.open || c.taken}
              className={`pairs__card ${c.open || c.taken ? "pairs__card--open" : ""} ${
                c.taken ? "pairs__card--taken" : ""
              }`}
              aria-label={c.open || c.taken ? "めくった札" : "裏向きの札"}
              data-track="sports-pairs-card"
            >
              <span className="pairs__back" />
              <span className="pairs__face">
                <Image src={c.photo} alt="" fill sizes="140px" loading="eager" className="object-cover" />
              </span>
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
