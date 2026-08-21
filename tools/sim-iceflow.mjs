/**
 * 流氷ゲーム（南極）の勝率シミュレータ。sim-gate.mjs / sim-balloon.mjs と同じ狙い。
 *
 *   node -e "import('./tools/sim-iceflow.mjs').then(m=>{for(const l of [1,3,5]) console.log(m.report(l))})"
 *
 * 注意: 定数は IceflowGame.tsx と二重管理。片方を変えたらもう片方も直すこと。
 */

export const JUMP_MIN = 3.5;
export const JUMP_MAX = 15;
const FRAME_MS = 1000 / 60;

export function tuning(level) {
  const t = (level - 1) / 4;
  const mix = (easy, hard) => easy + (hard - easy) * t;
  return {
    hops: Math.round(mix(5, 7)),
    dMin: mix(5, 6.5),
    dMax: mix(9, 13),
    width: mix(3.6, 2.9),
    chargeMs: mix(1100, 700),
  };
}

/**
 * プレイヤーのモデル。
 * aimErr: 「どれだけ跳べばいいか」の見積り誤差（単位は距離）
 * timeErr: 指を離すタイミングの誤差（フレーム）。ゲージが速いほど距離の誤差に化ける
 *   → chargeMs を短くすると難しくなるのはこの項のせい
 */
export const BEGINNER = { aimErr: 1.7, timeErr: 5 };
export const SKILLED = { aimErr: 0.55, timeErr: 2 };

function playOnce(cfg, model, rnd) {
  for (let h = 0; h < cfg.hops; h++) {
    const d = cfg.dMin + rnd() * (cfg.dMax - cfg.dMin);
    const left = d;
    const right = d + cfg.width;
    /* 狙う距離: 氷の真ん中を狙うが、見積りがずれる */
    const aim = (left + right) / 2 + (rnd() * 2 - 1) * model.aimErr;
    /* その距離を出すためのゲージ量。跳べる範囲を外れていたら端で頭打ち */
    const wanted = Math.max(0, Math.min(1, (aim - JUMP_MIN) / (JUMP_MAX - JUMP_MIN)));
    /* 指を離すタイミングのずれ → ゲージのずれ */
    const slip = ((rnd() * 2 - 1) * model.timeErr * FRAME_MS) / cfg.chargeMs;
    const charge = Math.max(0, Math.min(1, wanted + slip));
    const dist = JUMP_MIN + charge * (JUMP_MAX - JUMP_MIN);
    if (dist < left || dist > right) return false;
  }
  return true;
}

function makeRnd(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function winRate(cfg, model, runs = 3000, seed = 777) {
  const rnd = makeRnd(seed);
  let w = 0;
  for (let i = 0; i < runs; i++) if (playOnce(cfg, model, rnd)) w++;
  return w / runs;
}

export function report(level, override = {}) {
  const cfg = { ...tuning(level), ...override };
  const b = winRate(cfg, BEGINNER);
  const s = winRate(cfg, SKILLED);
  return `lv${level} ${JSON.stringify(cfg)}  初見 ${(b * 100).toFixed(1)}% / 慣れた人 ${(s * 100).toFixed(1)}%  差 ${((s - b) * 100).toFixed(1)}pt`;
}
