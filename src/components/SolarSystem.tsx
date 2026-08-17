"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Hobby } from "@/lib/data";
import { unlock, useIsUnlocked } from "@/lib/unlock";

const CareerRunGame = dynamic(() => import("@/components/games/CareerRunGame"), { ssr: false });

const CAREER_ID = "career";

/* 星の位置は固定の乱数列から作る。毎回作り直すとサーバーとクライアントで
   食い違ってハイドレーションエラーになるため、種を固定してモジュール読み込み時に決める */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rnd = mulberry32(20260817);
const STARS = Array.from({ length: 120 }, () => ({
  left: `${(rnd() * 100).toFixed(2)}%`,
  top: `${(rnd() * 100).toFixed(2)}%`,
  size: Number((rnd() * 2.1 + 0.7).toFixed(2)),
  dur: Number((rnd() * 4 + 2.4).toFixed(2)),
  delay: Number((-rnd() * 6).toFixed(2)),
}));

type Strength = { key: string; title: string; desc: string; link: string; linkLabel: string };

type Props = {
  sunName: string;
  sunPhoto: string;
  strengths: Strength[];
  career: string[];
  hobbies: Hobby[];
  visited: number;
};

/**
 * 軌道の直径（系の一辺に対する割合）と公転周期。外側ほどゆっくり回る。
 * delay は「5つが72度ずつ離れて散る」ように dur × (index / 5) で決めている
 * （0 のままだと全部真上から出発して団子になる）。
 * 最内周は、惑星が太陽に重ならない大きさが下限。
 */
const ORBITS = [
  { d: "46%", dur: 26, delay: 0 },
  { d: "57%", dur: 34, delay: -6.8 },
  { d: "68%", dur: 44, delay: -17.6 },
  { d: "79%", dur: 56, delay: -33.6 },
  { d: "90%", dur: 72, delay: -57.6 },
];

export default function SolarSystem({
  sunName,
  sunPhoto,
  strengths,
  career,
  hobbies,
  visited,
}: Props) {
  const careerOpen = useIsUnlocked(CAREER_ID);
  const [panel, setPanel] = useState<null | "career" | "hobby">(null);
  const [playing, setPlaying] = useState(false);

  const planetClass =
    "planet flex h-[clamp(66px,13vw,96px)] w-[clamp(66px,13vw,96px)] flex-col items-center justify-center rounded-full border-2 border-(--color-white)/85 bg-(--color-ink) px-1.5 text-center text-[clamp(11px,2.4vw,13px)] font-bold leading-tight text-(--color-white) shadow-[0_0_22px_rgba(0,0,0,0.55)] transition hover:scale-110 hover:border-(--color-accent) hover:bg-(--color-accent-dark)";

  return (
    /* globals.css の `a { color: inherit }` はレイヤー外なので Tailwind のユーティリティより強い。
       リンクの文字色はここで継承させる */
    <section className="space px-5 py-10 text-(--color-white) md:px-14 md:py-14">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {STARS.map((s, i) => (
          <span
            key={i}
            className="space__star"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      <div className="relative mx-auto flex max-w-[1120px] flex-col items-center">
        <p className="mb-6 text-sm text-(--color-bg-soft)/75">惑星を押すと中身が見られる</p>

        <div className="system aspect-square w-[min(92vw,660px)]">
          {/* 太陽 = こうき本人 */}
          <div className="sun h-[clamp(78px,21vw,148px)] w-[clamp(78px,21vw,148px)]">
            <Image
              src={sunPhoto}
              alt={sunName}
              fill
              sizes="148px"
              className="object-cover"
              style={{ objectPosition: "50% 35%" }}
            />
          </div>

          {/* 惑星: 強み3つ → 各ページへ、職歴と趣味 → その場で開く */}
          {strengths.map((s, i) => (
            <Orbit key={s.key} {...ORBITS[i]}>
              <Link href={s.link} className={planetClass} title={`${s.title} — ${s.desc}`}>
                {s.title}
              </Link>
            </Orbit>
          ))}

          <Orbit {...ORBITS[3]}>
            <button
              onClick={() => (careerOpen ? setPanel("career") : setPlaying(true))}
              className={planetClass}
              title={careerOpen ? "職歴" : "職歴（未解錠）"}
            >
              職歴
              {!careerOpen && <span className="text-(--color-clay)">？</span>}
            </button>
          </Orbit>

          <Orbit {...ORBITS[4]}>
            <button onClick={() => setPanel("hobby")} className={planetClass} title="趣味・活動">
              趣味
              <br />
              活動
            </button>
          </Orbit>
        </div>
      </div>

      {panel === "career" && (
        <Panel title="職歴" onClose={() => setPanel(null)}>
          <ul className="m-0 list-none p-0 text-left">
            {career.map((step, i) => (
              <li
                key={i}
                className="relative ml-1 border-l-2 border-(--color-line) py-1.5 pl-5 text-sm"
              >
                <span className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-(--color-accent)" />
                {step}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {panel === "hobby" && (
        <Panel title="趣味・活動" onClose={() => setPanel(null)}>
          <p className="my-1 mb-4 flex items-baseline gap-2">
            <strong className="font-display text-4xl font-extrabold leading-none text-(--color-accent-dark)">
              {visited}
            </strong>
            <span className="text-sm text-(--color-ink-soft)">カ国制覇</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {hobbies.map((h) =>
              h.href ? (
                <a
                  key={h.label}
                  href={h.href}
                  target="_blank"
                  rel="noopener"
                  className="rounded-full border border-(--color-line) bg-(--color-bg-soft) px-4 py-2 text-sm font-semibold transition hover:border-(--color-accent) hover:text-(--color-accent-dark)"
                >
                  {h.label}
                </a>
              ) : (
                <span
                  key={h.label}
                  className="rounded-full border border-(--color-line) bg-(--color-bg-soft) px-4 py-2 text-sm font-semibold"
                >
                  {h.label}
                </span>
              )
            )}
          </div>
        </Panel>
      )}

      {playing && (
        <CareerRunGame
          steps={career}
          onReveal={() => {
            unlock(CAREER_ID);
            setPlaying(false);
            setPanel("career");
          }}
          onClose={() => setPlaying(false)}
          onUnlockAll={() => {
            setPlaying(false);
            setPanel("career");
          }}
        />
      )}
    </section>
  );
}

function Orbit({
  d,
  dur,
  delay,
  children,
}: {
  d: string;
  dur: number;
  delay: number;
  children: ReactNode;
}) {
  return (
    <div
      className="orbit"
      style={
        {
          "--d": d,
          "--dur": `${dur}s`,
          "--delay": `${delay}s`,
        } as React.CSSProperties
      }
    >
      <div className="orbit__anchor">
        <div className="orbit__spin">{children}</div>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative max-h-[86vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-(--color-ink) bg-(--color-white) p-6 pt-8 text-(--color-ink)">
        <button
          onClick={onClose}
          aria-label="閉じる"
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-(--color-bg-soft) text-lg"
        >
          &times;
        </button>
        <h3 className="mb-3 font-display text-xl font-bold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
