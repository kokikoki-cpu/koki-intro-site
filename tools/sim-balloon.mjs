/**
 * 気球ゲーム（トルコ）の勝率シミュレータ。
 * `tools/sim-gate.mjs` と同じ狙い: 「初見の人が何割勝てるか」を勘で当てず、
 * ゲームのロジックをそのまま再現して初心者モデルを何百回も走らせて測る。
 *
 * 使い方:
 *   node -e "import('./tools/sim-balloon.mjs').then(m=>console.log(m.report(1)))"
 *   node -e "import('./tools/sim-balloon.mjs').then(m=>console.log(m.report(5)))"
 *
 * 注意: 定数は BalloonGame.tsx と二重管理になる。片方を変えたらもう片方も直すこと
 * （sim-gate.mjs も同じ割り切りをしている）。
 */

/* --- BalloonGame.tsx と同じ値 ------------------------------------------- */
export const LIFT = 12;
export const GRAVITY = -6.5;
export const DRAG = 0.985;
export const VY_MAX = 6;
export const Y_MIN = -7;
export const Y_MAX = 13;
export const HIT_R = 1.5;
const BALLOON_X = -7;
const SPAWN_X = 34;
const DT = 1 / 60;

export function tuning(level) {
  const t = (level - 1) / 4;
  const mix = (easy, hard) => easy + (hard - easy) * t;
  return {
    gates: Math.round(mix(4, 8)),
    gap: mix(10, 9),
    speed: mix(9.5, 15),
    intervalMs: mix(2000, 1450),
  };
}

/* --- プレイヤーのモデル -------------------------------------------------- */
/**
 * delay: 反応の遅れ（フレーム）。人間の反応は0.2秒前後なので初見は12前後
 * antic: 先読みの強さ。0だと位置だけ見て操作してガタガタになる（人間はもう少し読む）
 * freezeP: 1フレームあたり「手が止まる」確率。止まると18フレーム放してしまう
 * aimErr: 狙う高さの誤差（隙間の中心をきっちり狙えない）
 * dead: 不感帯。これだけずれるまで操作を変えない。
 *   **これが無いとモデルが人間から遠くなる**: 毎フレーム焚く/放すを切り替えると
 *   浮力と重力の間で激しく振動して、どんなに隙間を広げても抜けられなくなる。
 *   人は「ある程度ずれてから直す」のでこの項が要る（実測 0% → 現実的な値に変わった）
 */
export const BEGINNER = { delay: 12, antic: 0.18, freezeP: 0.006, aimErr: 0.9, dead: 0.9 };
export const SKILLED = { delay: 4, antic: 0.34, freezeP: 0.001, aimErr: 0.25, dead: 0.35 };

function playOnce(cfg, model, rnd) {
  let y = 3;
  let vy = 0;
  let passed = 0;
  let elapsed = 0;
  let lastSpawn = -Infinity;
  const gates = [];
  const hist = [];
  let freeze = 0;
  /* 門ごとの狙いのずれ。門が変わるたびに引き直す */
  let aimBias = 0;
  let aimFor = null;
  let lastBurn = false;

  for (let f = 0; f < 4000; f++) {
    elapsed += DT * 1000;

    if (elapsed - lastSpawn > cfg.intervalMs) {
      gates.push({ x: SPAWN_X, gapY: -1 + rnd() * 7, scored: false });
      lastSpawn = elapsed;
    }

    hist.push({ y, vy, gates: gates.map((g) => ({ ...g })) });
    const past = hist[Math.max(0, hist.length - model.delay)];
    const next = past.gates.filter((g) => !g.scored).sort((a, b) => a.x - b.x)[0];
    if (next && aimFor !== next.gapY) {
      aimFor = next.gapY;
      aimBias = (rnd() * 2 - 1) * model.aimErr;
    }
    const target = next ? next.gapY + aimBias : 2.5;

    let burn;
    if (freeze > 0) {
      freeze--;
      burn = false;
    } else {
      if (rnd() < model.freezeP) freeze = 18;
      /* 不感帯つき。ずれが小さいうちは前の操作を続ける */
      const err = target - (past.y + past.vy * model.antic);
      if (err > model.dead) burn = true;
      else if (err < -model.dead) burn = false;
      else burn = lastBurn;
    }
    lastBurn = burn;

    vy += (burn ? LIFT : 0) * DT + GRAVITY * DT;
    vy *= DRAG;
    vy = Math.max(-VY_MAX, Math.min(VY_MAX, vy));
    y = Math.max(Y_MIN, Math.min(Y_MAX, y + vy * DT));
    if (y <= Y_MIN || y >= Y_MAX) vy = 0;

    for (let i = gates.length - 1; i >= 0; i--) {
      const g = gates[i];
      g.x -= cfg.speed * DT;
      if (!g.scored && g.x < BALLOON_X) {
        g.scored = true;
        passed++;
        if (passed >= cfg.gates) return true;
      }
      if (Math.abs(g.x - BALLOON_X) < 2.6 && Math.abs(y - g.gapY) > cfg.gap / 2 - HIT_R) {
        return false;
      }
      if (g.x < -40) gates.splice(i, 1);
    }
  }
  return false;
}

/** 種を固定した乱数（毎回同じ結果になる方が調整しやすい） */
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

export function winRate(cfg, model, runs = 600, seed = 12345) {
  const rnd = makeRnd(seed);
  let w = 0;
  for (let i = 0; i < runs; i++) if (playOnce(cfg, model, rnd)) w++;
  return w / runs;
}

export function report(level, override = {}) {
  const cfg = { ...tuning(level), ...override };
  const beg = winRate(cfg, BEGINNER);
  const skl = winRate(cfg, SKILLED);
  return `lv${level} ${JSON.stringify(cfg)}  初見 ${(beg * 100).toFixed(1)}% / 慣れた人 ${(skl * 100).toFixed(1)}%  差 ${((skl - beg) * 100).toFixed(1)}pt`;
}
