"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import WarpLink from "@/components/WarpLink";
import dynamic from "next/dynamic";
import { COUNTRIES, PEOPLE, SPORTS, type Hobby } from "@/lib/data";
import { unlock, useIsUnlocked, useUnlockedFrom } from "@/lib/unlock";

/* 各惑星の収集対象。トップで「どれだけ集めたか」を出すために使う */
const COUNTRY_IDS = COUNTRIES.map((c) => c.id);
const PEOPLE_IDS = PEOPLE.map((p) => p.id);
const SPORT_IDS = SPORTS.map((s) => s.id);

/** 惑星の顔になる実写。CSSで描いた飾りではなく写真を主役にする */
const PLANET_PHOTO: Record<string, string> = {
  action: "/images/countries/namibia.jpg",
  curiosity: "/images/people/p3-india.jpg",
  body: "/images/sports/marathon.jpg",
};

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
  /* 最内周は「半径 − 惑星の半径 − ラベルの高さ > 太陽の半径」まで広げてある。
     ここを詰めると、内周の惑星のラベルが太陽の写真に乗る */
  { d: "58%", dur: 26, delay: 0 },
  { d: "67%", dur: 34, delay: -6.8 },
  { d: "76%", dur: 44, delay: -17.6 },
  { d: "85%", dur: 56, delay: -33.6 },
  { d: "94%", dur: 72, delay: -57.6 },
];

/**
 * 惑星の直径。中身の数から決めるので、国を1つ追加すればその惑星が育つ。
 * 「なんとなく大きい」を作らないためのルール（1件=65px 〜 9件=121px）。
 */
function planetSize(count: number): string {
  const d = Math.round(56 + count * 6.5);
  const min = Math.max(54, Math.round(d * 0.6));
  return `clamp(${min}px, ${(d / 6.4).toFixed(1)}vw, ${d}px)`;
}

/** 中身の多い惑星にだけ輪を付ける。輪は「ここが本体だ」という重み付けの記号 */
function PlanetRings({ double }: { double?: boolean }) {
  return (
    <>
      <span className="planet-ring" aria-hidden />
      {double && <span className="planet-ring planet-ring--outer" aria-hidden />}
      <span className="planet-ring planet-ring--front" aria-hidden />
      {double && <span className="planet-ring planet-ring--outer planet-ring--front" aria-hidden />}
    </>
  );
}

type Strength = { key: string; title: string; desc: string; link: string; linkLabel: string };

type Props = {
  name: string;
  sunPhoto: string;
  photos: string[];
  strengths: Strength[];
  career: string[];
  hobbies: Hobby[];
  visited: number;
};

export default function CosmosHome({
  name,
  sunPhoto,
  photos,
  strengths,
  career,
  hobbies,
  visited,
}: Props) {
  const careerOpen = useIsUnlocked(CAREER_ID);
  const foundCountries = useUnlockedFrom(COUNTRY_IDS);
  const foundPeople = useUnlockedFrom(PEOPLE_IDS);
  const foundSports = useUnlockedFrom(SPORT_IDS);
  /* 流星が使う写真の番号。1本が一周するたびに次へ送るので、
     8本しか無くても眺めているうちにプール全部が空を通る */
  const [skyIdx, setSkyIdx] = useState<number[]>(() => SHOOTERS.map((_, i) => i));
  const [panel, setPanel] = useState<null | "career" | "hobby" | "memory">(null);
  const [playing, setPlaying] = useState(false);

  /* 強み3つの惑星に、集めた数を出す。順番はこの進み具合で示すので、
     文章の案内は置かない */
  const progress: Record<string, { got: number; total: number }> = {
    action: { got: foundCountries.size, total: COUNTRY_IDS.length },
    curiosity: { got: foundPeople.size, total: PEOPLE_IDS.length },
    body: { got: foundSports.size, total: SPORT_IDS.length },
  };
  const collected =
    foundCountries.size + foundPeople.size + foundSports.size + (careerOpen ? 1 : 0);
  const collectTotal = COUNTRY_IDS.length + PEOPLE_IDS.length + SPORT_IDS.length + 1;

  const planetClass = "planet relative block transition hover:scale-105";

  /* 惑星の並び順は「抱えているコンテンツの数」で決める。
     数が多い惑星ほど大きく、外側の軌道をゆっくり回る（質量が大きいものは外周、という見立て）。
     内側から: 職歴1 → 趣味3 → 人4 → スポーツ6 → 国9。
     最内周に大きい惑星を置くと太陽に食い込む（最内周の半径 − 惑星の半径 > 太陽の半径）ため、
     この順番自体が制約を満たすための設計でもある。 */
  const orbitFor: Record<string, number> = {
    career: 0,
    hobby: 1,
    curiosity: 2,
    body: 3,
    action: 4,
  };

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
            /* 一周し終わったタイミングで写真を差し替える。
               流れている最中に変えると、写真だけ突然入れ替わって見える */
            onAnimationIteration={() =>
              setSkyIdx((prev) => {
                const next = [...prev];
                next[i] = (next[i] + SHOOTERS.length) % photos.length;
                return next;
              })
            }
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
                    src={photos[skyIdx[i] % photos.length]}
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
          <h1 className="font-display text-[clamp(2.8rem,9vw,6rem)] font-extrabold leading-[0.98] tracking-tight">
            Who am I ?
          </h1>
          <button
            onClick={() => setPanel("memory")}
            data-track="home-memory-open"
            className="memory-btn mt-4 inline-flex items-center gap-3 rounded-full border-2 border-(--color-ember) bg-(--color-space)/85 px-6 py-3 text-left transition hover:scale-105 hover:border-(--color-white)"
          >
            <span className="font-display text-3xl font-extrabold leading-none text-(--color-white)">
              {collected}
              <span className="text-lg text-(--color-ember)/75"> / {collectTotal}</span>
            </span>
            {/* 装飾的な英語ラベル（旧 "COLLECTION"）は使わない。日本語の見出しだけで足りる */}
            <span className="text-sm font-extrabold leading-tight text-(--color-white)">集めた記憶を見る</span>
          </button>
        </header>

        {/* 高さも制約に入れる。惑星が中身の数で育つようになったので、幅だけで決めると
            外周の惑星が画面の下で切れる（実際に切れた） */}
        <div className="system mt-6 aspect-square w-[min(86vw,52vh,520px)]">
          {/* 太陽 = こうき本人 */}
          {/* 太陽の大きさは系に対する比率で決める。px固定だと系が縮んだときだけ太陽が
              相対的に大きくなり、最内周の惑星とラベルが太陽に乗る（実際に乗った） */}
          <div className="sun aspect-square w-[25%]">
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
          {strengths.map((s) => {
            const p = progress[s.key];
            const size = planetSize(p?.total ?? 1);
            return (
              <Orbit key={s.key} {...ORBITS[orbitFor[s.key] ?? 2]}>
                <WarpLink
                  href={s.link}
                  className={planetClass}
                  title={s.title}
                  style={{ width: size, height: size }}
                  dataTrack={`home-planet-${s.key}`}
                >
                  {/* 国が9つで最多 → 二重の輪。スポーツは6つ → 一重 */}
                  {s.key === "action" && <PlanetRings double />}
                  {s.key === "body" && <PlanetRings />}
                  <span className="orb block h-full w-full">
                    <Image
                      src={PLANET_PHOTO[s.key]}
                      alt={s.title}
                      fill
                      sizes="120px"
                      className="object-cover"
                    />
                  </span>
                  <span className="mt-1.5 block text-center font-display text-[clamp(11px,2.2vw,13px)] font-extrabold text-(--color-white)">
                    {s.title}
                    {p && (
                      <span className="ml-1 text-(--color-ember)">
                        {p.got}/{p.total}
                      </span>
                    )}
                  </span>
                </WarpLink>
              </Orbit>
            );
          })}

          <Orbit {...ORBITS[orbitFor.career]}>
            <button
              onClick={() => (careerOpen ? setPanel("career") : setPlaying(true))}
              data-track={careerOpen ? "home-planet-career" : "home-planet-career-locked"}
              className={planetClass}
              style={{ width: planetSize(1), height: planetSize(1) }}
              title={careerOpen ? "職歴" : "職歴（未解錠）"}
            >
              <span className="orb flex h-full w-full items-center justify-center bg-(--color-space)">
                <span className="font-display text-2xl font-extrabold text-(--color-white)">
                  {careerOpen ? "歴" : "？"}
                </span>
              </span>
              <span className="mt-1.5 block text-center font-display text-[clamp(11px,2.2vw,13px)] font-extrabold text-(--color-white)">
                職歴
              </span>
            </button>
          </Orbit>

          <Orbit {...ORBITS[orbitFor.hobby]}>
            <button
              onClick={() => setPanel("hobby")}
              data-track="home-planet-hobby"
              className={planetClass}
              style={{ width: planetSize(hobbies.length), height: planetSize(hobbies.length) }}
              title="趣味・活動"
            >
              <span className="orb flex h-full w-full items-center justify-center bg-(--color-space)">
                <span className="font-display text-2xl font-extrabold text-(--color-white)">趣</span>
              </span>
              <span className="mt-1.5 block text-center font-display text-[clamp(11px,2.2vw,13px)] font-extrabold text-(--color-white)">
                趣味・活動
              </span>
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
                <span className="absolute -left-[5px] top-3.5 h-2 w-2 rounded-full bg-(--color-ember)" />
                {step}
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {panel === "hobby" && (
        <Panel title="趣味・活動" onClose={() => setPanel(null)}>
          <p className="my-1 mb-4 flex items-baseline gap-2">
            <strong className="font-display text-4xl font-extrabold leading-none text-(--color-nebula)">
              {visited}
            </strong>
            <span className="text-sm text-(--color-ink-soft)">カ国制覇</span>
          </p>
          <div className="flex flex-wrap gap-2.5">
            {hobbies.map((h) =>
              h.href ? (
                /* 外部リンクは、ただの札と絶対に見分けがつくようにする:
                   濃い色で塗る／震わせる／矢印を付ける／下線を引く */
                <a
                  key={h.label}
                  href={h.href}
                  target="_blank"
                  rel="noopener"
                  className="jiggle inline-flex items-center gap-2 btn-ember btn-ember--solid px-5 py-3 text-sm !font-extrabold transition hover:scale-105"
                >
                  <span className="underline decoration-2 underline-offset-2">{h.label}</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M7 17L17 7M9 7h8v8" />
                  </svg>
                </a>
              ) : (
                <span
                  key={h.label}
                  className="rounded-full border border-(--color-line) bg-(--color-bg-soft) px-4 py-2 text-sm font-semibold text-(--color-ink-soft)"
                >
                  {h.label}
                </span>
              )
            )}
          </div>
        </Panel>
      )}

      {panel === "memory" && (
        <Panel title={`集めた記憶 ${collected} / ${collectTotal}`} onClose={() => setPanel(null)}>
          <div className="flex flex-col gap-4 text-left">
            {/* 賞品の告知は、集めた数のすぐ隣に置く（「続けるか」を決める場所だから）。
                集めきったあとは告知ではなく祝いの文になる。
                枠線は明るい面のカード言語（2pxの墨）。クレイの枠線だと「謎の赤線」に
                見えて、夜空の世界観から浮く */}
            {collected >= collectTotal ? (
              <p className="m-0 rounded-md border-2 border-(--color-ink) bg-(--color-bg-soft) px-4 py-3 text-center font-display text-base font-extrabold">
                全記憶を回収。こうきから賞品をプレゼント
              </p>
            ) : (
              <p className="m-0 rounded-md border-2 border-(--color-ink) bg-(--color-bg-soft) px-4 py-3 text-center font-display text-base font-extrabold">
                全部クリアしたらこうきから賞品をプレゼント
                <span className="ml-2 text-sm font-extrabold text-(--color-ink-soft)">
                  あと{collectTotal - collected}個
                </span>
              </p>
            )}
            <MemoryGroup
              title="あぁ素晴らしき地球"
              href="/world"
              items={COUNTRIES.map((c) => ({ label: c.name, got: foundCountries.has(c.id) }))}
            />
            <MemoryGroup
              title="世界のクセ強人類"
              href="/people"
              items={PEOPLE.map((p) => ({ label: p.name, got: foundPeople.has(p.id) }))}
            />
            <MemoryGroup
              title="スポーツの惑星"
              href="/sports"
              items={SPORTS.map((s) => ({ label: s.name, got: foundSports.has(s.id) }))}
            />
            <MemoryGroup title="職歴" items={[{ label: "経歴", got: careerOpen }]} />
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

/** 集めた記憶の一覧。取ったものは名前が出て、まだのものは伏せる */
function MemoryGroup({
  title,
  href,
  items,
}: {
  title: string;
  href?: string;
  items: { label: string; got: boolean }[];
}) {
  const got = items.filter((i) => i.got).length;
  return (
    <div>
      <p className="mb-1.5 flex items-baseline gap-2 text-sm font-extrabold">
        {title}
        <span className="text-(--color-nebula)">
          {got} / {items.length}
        </span>
        {href && got < items.length && (
          <Link href={href} className="ml-auto text-xs font-extrabold text-(--color-nebula) underline">
            集めにいく →
          </Link>
        )}
      </p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((it, i) => (
          <span
            key={i}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              it.got
                ? "bg-(--color-ember) text-(--color-space)"
                : "bg-(--color-bg-soft) text-(--color-ink-soft)/50"
            }`}
          >
            {it.got ? it.label : "？"}
          </span>
        ))}
      </div>
    </div>
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
        <h3 className="mb-3 font-display text-xl font-extrabold">{title}</h3>
        {children}
      </div>
    </div>
  );
}
