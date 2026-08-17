"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Hobby } from "@/lib/data";
import { unlock, useIsUnlocked } from "@/lib/unlock";

const CareerRunGame = dynamic(() => import("@/components/games/CareerRunGame"), { ssr: false });

const CAREER_ID = "career";

/* 星の位置は種を固定した乱数で決める。描画ごとに振るとサーバーとクライアントで
   食い違ってハイドレーションエラーになる */
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
const STARS = Array.from({ length: 150 }, () => ({
  left: `${(rnd() * 100).toFixed(2)}%`,
  top: `${(rnd() * 100).toFixed(2)}%`,
  size: Number((rnd() * 2.1 + 0.7).toFixed(2)),
  dur: Number((rnd() * 4 + 2.4).toFixed(2)),
  delay: Number((-rnd() * 6).toFixed(2)),
}));

/**
 * 流れ星の軌跡。`angle` は進行方向（右上から左下へ流すので 150〜170度あたり）、
 * `dist` はその方向へ進む距離。delay を散らして、常時2〜3本だけ見えるようにしている。
 */
const SHOOTERS = [
  { top: "4%", left: "104%", angle: 163, dist: "142vw", dur: 9.5, delay: -1.2, w: 118, trail: 210 },
  { top: "20%", left: "108%", angle: 156, dist: "134vw", dur: 11, delay: -5.5, w: 96, trail: 176 },
  { top: "-6%", left: "96%", angle: 169, dist: "150vw", dur: 8.2, delay: -3.6, w: 132, trail: 244 },
  { top: "36%", left: "106%", angle: 158, dist: "128vw", dur: 12.5, delay: -8.1, w: 88, trail: 152 },
  { top: "11%", left: "112%", angle: 166, dist: "146vw", dur: 10.2, delay: -6.8, w: 106, trail: 196 },
  { top: "28%", left: "100%", angle: 161, dist: "136vw", dur: 13.4, delay: -10.5, w: 92, trail: 168 },
  { top: "46%", left: "110%", angle: 154, dist: "124vw", dur: 14.2, delay: -2.4, w: 84, trail: 146 },
  { top: "1%", left: "118%", angle: 159, dist: "152vw", dur: 11.8, delay: -9.3, w: 108, trail: 202 },
];

/**
 * 軌道の直径（系の一辺に対する割合）と公転周期。外側ほどゆっくり回る。
 * delay は「5つが72度ずつ離れて散る」ように dur × (index / 5) で決めている
 * （0 のままだと全部真上から出発して団子になる）。
 * 最内周は「その半径 − 惑星の半径 > 太陽の半径」を満たす大きさが下限。
 */
const ORBITS = [
  { d: "46%", dur: 26, delay: 0 },
  { d: "57%", dur: 34, delay: -6.8 },
  { d: "68%", dur: 44, delay: -17.6 },
  { d: "79%", dur: 56, delay: -33.6 },
  { d: "90%", dur: 72, delay: -57.6 },
];

type Strength = { key: string; title: string; desc: string; link: string; linkLabel: string };

type Props = {
  name: string;
  tagline: string;
  meta: string;
  sunPhoto: string;
  photos: string[];
  strengths: Strength[];
  career: string[];
  hobbies: Hobby[];
  visited: number;
};

export default function CosmosHome({
  name,
  tagline,
  meta,
  sunPhoto,
  photos,
  strengths,
  career,
  hobbies,
  visited,
}: Props) {
  const careerOpen = useIsUnlocked(CAREER_ID);
  const [panel, setPanel] = useState<null | "career" | "hobby">(null);
  const [playing, setPlaying] = useState(false);

  const planetClass =
    "planet flex h-[clamp(60px,12.5vw,94px)] w-[clamp(60px,12.5vw,94px)] flex-col items-center justify-center rounded-full border-2 border-(--color-white)/85 bg-(--color-ink) px-1.5 text-center text-[clamp(11px,2.3vw,13px)] font-bold leading-tight text-(--color-white) shadow-[0_0_22px_rgba(0,0,0,0.6)] transition hover:scale-110 hover:border-(--color-accent) hover:bg-(--color-accent-dark)";

  return (
    /* globals.css の `a { color: inherit }` はレイヤー外で Tailwind より強いので、
       暗い背景の上のリンク色はここで継承させる */
    <section className="space flex min-h-[calc(100vh-60px)] flex-col justify-center px-5 pb-10 pt-[clamp(28px,6vh,64px)] text-(--color-white) md:px-14">
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

        {SHOOTERS.map((s, i) => (
          <div
            key={i}
            className="shooter"
            style={
              {
                top: s.top,
                left: s.left,
                "--angle": `${s.angle}deg`,
                "--dist": s.dist,
                "--dur": `${s.dur}s`,
                "--delay": `${s.delay}s`,
                "--trail": `${s.trail}px`,
              } as CSSProperties
            }
          >
            <div className="shooter__run" style={{ width: s.w }}>
              <div className="shooter__trail" />
              <div className="shooter__upright">
                <div className="shooter__photo aspect-4/3 w-full">
                  <Image
                    src={photos[i % photos.length]}
                    alt=""
                    fill
                    sizes="140px"
                    className="object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* w-full は必須。flex の子で mx-auto を使うと stretch が無効になり、
          最大幅まで広がらず最も広い子（太陽系）の幅に縮んでしまう */}
      <div className="relative mx-auto flex w-full max-w-[1120px] flex-col items-center">
        <header className="w-full">
          <h1 className="font-display text-[clamp(2.6rem,8vw,5.5rem)] font-extrabold leading-[0.98] tracking-tight">
            {name}
          </h1>
          <p className="mt-2 font-display text-lg font-bold tracking-[0.18em] text-(--color-bg-soft) md:text-2xl">
            {tagline}
          </p>
          <p className="mt-1.5 text-sm text-(--color-bg-soft)/60">{meta}</p>
        </header>

        <p className="mt-8 text-sm text-(--color-bg-soft)/70">惑星を押すと中身が見られる</p>

        <div className="system mt-2 aspect-square w-[min(88vw,560px)]">
          {/* 太陽 = こうき本人 */}
          <div className="sun h-[clamp(74px,20vw,144px)] w-[clamp(74px,20vw,144px)]">
            <Image
              src={sunPhoto}
              alt={name}
              fill
              sizes="144px"
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
                  className="rounded-full border border-(--color-line) bg-(--color-bg-soft) px-4 py-2 text-sm font-semibold text-(--color-ink) transition hover:border-(--color-accent) hover:text-(--color-accent-dark)"
                >
                  {h.label}
                </a>
              ) : (
                <span
                  key={h.label}
                  className="rounded-full border border-(--color-line) bg-(--color-bg-soft) px-4 py-2 text-sm font-semibold text-(--color-ink)"
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
        } as CSSProperties
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
