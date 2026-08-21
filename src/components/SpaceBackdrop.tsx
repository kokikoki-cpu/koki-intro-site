"use client";

/**
 * 下層ページ用の宇宙背景。トップページの星空と世界観を揃えるためのもの。
 * 星は種を固定した乱数で置く（描画ごとに振るとサーバーとクライアントで食い違う）。
 */

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

/** spread は星を散らす高さ(%)。地平線のある場面は上側だけ、宇宙だけの場面は全面 */
function makeStars(seed: number, count: number, spread = 62) {
  const rnd = mulberry32(seed);
  return Array.from({ length: count }, () => ({
    left: `${(rnd() * 100).toFixed(2)}%`,
    top: `${(rnd() * spread).toFixed(2)}%`,
    size: Number((rnd() * 1.9 + 0.7).toFixed(2)),
    dur: Number((rnd() * 4 + 2.4).toFixed(2)),
    delay: Number((-rnd() * 6).toFixed(2)),
  }));
}

/** ページごとに星の並びを変える */
const STARS = {
  sun: makeStars(4801, 110),
  desert: makeStars(9137, 110),
  steppe: makeStars(2264, 110),
  /* 地平線のない、星だけの空（オープニング用） */
  void: makeStars(7717, 140, 100),
};

export type Scenery = "sun" | "desert" | "steppe" | "void";

export default function SpaceBackdrop({ scenery }: { scenery: Scenery }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {STARS[scenery].map((s, i) => (
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

      {scenery === "sun" && <Sun />}
      {scenery === "desert" && <Desert />}
      {scenery === "steppe" && <Steppe />}
    </div>
  );
}

/** 地球のページ: 地平線から昇る太陽 */
function Sun() {
  return (
    <>
      <div className="scene-sun" />
      <svg className="scene-horizon" viewBox="0 0 1440 220" preserveAspectRatio="none">
        <path d="M0 128 C220 96 420 150 660 122 C900 94 1130 148 1440 112 L1440 220 L0 220 Z" fill="#1b2418" />
        <path d="M0 170 C260 146 520 188 800 164 C1060 142 1240 180 1440 158 L1440 220 L0 220 Z" fill="#0e1410" />
      </svg>
    </>
  );
}

/** スポーツのページ: 砂漠の砂丘 */
function Desert() {
  return (
    <>
      <div className="scene-glow scene-glow--warm" />
      <svg className="scene-horizon" viewBox="0 0 1440 260" preserveAspectRatio="none">
        <path d="M0 150 C240 78 470 176 720 128 C960 82 1180 168 1440 118 L1440 260 L0 260 Z" fill="#3a2c1c" />
        <path d="M0 196 C300 142 560 214 860 178 C1120 148 1290 206 1440 180 L1440 260 L0 260 Z" fill="#241a10" />
        <path d="M0 234 C320 210 640 246 980 224 C1200 210 1330 236 1440 226 L1440 260 L0 260 Z" fill="#140e08" />
      </svg>
    </>
  );
}

/** 人図鑑のページ: モンゴルの草原とゲル */
function Steppe() {
  return (
    <>
      <div className="scene-glow scene-glow--cool" />
      <svg className="scene-horizon" viewBox="0 0 1440 240" preserveAspectRatio="none">
        <path d="M0 118 C180 92 340 126 520 108 C700 90 880 124 1080 104 C1250 88 1360 116 1440 104 L1440 240 L0 240 Z" fill="#1d2a1b" />
        {/* ゲル（モンゴルの移動式住居）の影 */}
        <path d="M604 132 L628 112 L652 132 Z" fill="#0f1610" />
        <rect x="608" y="132" width="40" height="18" fill="#0f1610" />
        <path d="M700 136 L716 120 L732 136 Z" fill="#0f1610" />
        <rect x="703" y="136" width="26" height="14" fill="#0f1610" />
        <path d="M0 168 C280 146 560 184 840 162 C1100 142 1280 176 1440 158 L1440 240 L0 240 Z" fill="#101810" />
      </svg>
    </>
  );
}
