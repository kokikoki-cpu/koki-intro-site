/**
 * ShootingGameGate のゲームロジックをそのまま再現して、初見プレイヤーの勝率を測る。
 * 「初見で50%くらい」に調整するための土台。
 */

const CANVAS_W = 360;
const CANVAS_H = 560;
const PLAYER_W = 34;
const PLAYER_H = 26;
const PLAYER_Y = CANVAS_H - 50;
const ENEMY_SIZE = 26;
const BULLET_SPEED = 8;
const FRAME_MS = 1000 / 60;

function makeGame(cfg) {
  const DODGE_START_Y = PLAYER_Y - cfg.dodgeStart;

  function enemyDisplayX(en) {
    if (en.y <= DODGE_START_Y) return en.baseX;
    const progress = Math.min(1, (en.y - DODGE_START_Y) / (PLAYER_Y - DODGE_START_Y));
    // juke: 一度よけてから終盤で逆に切り返す（追従だけでは置いていかれる）
    const shape = cfg.juke
      ? Math.sin(progress * Math.PI * 1.5)
      : progress * progress;
    const x = en.baseX + en.driftDir * en.driftAmp * shape;
    return Math.max(ENEMY_SIZE / 2, Math.min(CANVAS_W - ENEMY_SIZE / 2, x));
  }

  return { enemyDisplayX, DODGE_START_Y };
}

/**
 * 初見プレイヤーの模型。
 * - 一番下（自機に近い）の敵を狙う
 * - 反応が遅れる: すこし前の敵の位置を見て動く
 * - 先読みしない（敵の横ズレを予測できない）
 * - 狙いにブレがある
 */
function beginnerPolicy(rng, opts) {
  let lastDecisionAt = -1e9;
  let desiredX = CANVAS_W / 2;
  let frozenUntil = -1;
  const history = [];

  return function decide(t, enemies, playerX, enemyDisplayX) {
    history.push({ t, snapshot: enemies.map((e) => ({ x: enemyDisplayX(e), y: e.y })) });
    while (history.length > 60) history.shift();

    // 手が止まる（何を狙うか迷う／操作が追いつかない）
    if (t < frozenUntil) return 0;

    if (t - lastDecisionAt >= opts.decisionInterval) {
      lastDecisionAt = t;
      if (opts.freezeChance && rng() < opts.freezeChance) {
        frozenUntil = t + opts.freezeMs;
        return 0;
      }

      // 反応遅れ: opts.reactionMs 前の画面を見て判断する
      let seen = history[0];
      for (const h of history) if (t - h.t >= opts.reactionMs) seen = h;

      const visible = seen.snapshot.filter((e) => e.y > -10);
      if (visible.length > 0) {
        let target;
        if (opts.wrongTargetChance && rng() < opts.wrongTargetChance) {
          // 初心者は、下まで来ている敵より目立つ（新しく出た）敵を追ってしまう
          target = visible.reduce((a, e) => (e.y < a.y ? e : a), visible[0]);
        } else {
          target = visible.reduce((a, e) => (e.y > a.y ? e : a), visible[0]);
        }
        desiredX = target.x + (rng() * 2 - 1) * opts.aimNoise;
      }
    }

    const diff = desiredX - playerX;
    if (Math.abs(diff) < opts.deadZone) return 0;
    return diff > 0 ? 1 : -1;
  };
}

function mulberry32(seed) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playOnce(cfg, player, seed) {
  const rng = mulberry32(seed);
  const { enemyDisplayX } = makeGame(cfg);
  const decide = beginnerPolicy(rng, player);

  let playerX = CANVAS_W / 2;
  let score = 0;
  let lives = cfg.startLives;
  let bullets = [];
  let enemies = [];
  let lastFire = 0;
  let lastSpawn = 0;
  let t = 0;

  for (let frame = 0; frame < 60 * 180; frame++) {
    t = frame * FRAME_MS;

    const moveDir = decide(t, enemies, playerX, enemyDisplayX);
    playerX = Math.max(
      PLAYER_W / 2,
      Math.min(CANVAS_W - PLAYER_W / 2, playerX + moveDir * cfg.playerSpeed)
    );

    if (t - lastFire > cfg.fireInterval) {
      bullets.push({ x: playerX, y: PLAYER_Y });
      lastFire = t;
    }

    if (t - lastSpawn > cfg.spawnInterval) {
      enemies.push({
        baseX: ENEMY_SIZE / 2 + rng() * (CANVAS_W - ENEMY_SIZE),
        y: -ENEMY_SIZE,
        speed: cfg.speedMin + rng() * cfg.speedSpread,
        driftDir: rng() < 0.5 ? -1 : 1,
        driftAmp: cfg.driftMin + rng() * cfg.driftSpread,
      });
      lastSpawn = t;
    }

    bullets = bullets.map((b) => ({ ...b, y: b.y - BULLET_SPEED })).filter((b) => b.y > -10);

    const survivors = [];
    for (const en of enemies) {
      const ny = en.y + en.speed;
      if (ny > CANVAS_H) {
        lives -= 1;
        continue;
      }
      survivors.push({ ...en, y: ny });
    }
    enemies = survivors;

    const remaining = [];
    const hitBullets = new Set();
    for (const en of enemies) {
      let hit = false;
      const enX = enemyDisplayX(en);
      bullets.forEach((b, bi) => {
        if (hitBullets.has(bi) || hit) return;
        if (
          Math.abs(b.x - enX) < ENEMY_SIZE / 2 + cfg.hitTolX &&
          Math.abs(b.y - en.y) < ENEMY_SIZE / 2 + cfg.hitTolY
        ) {
          hit = true;
          hitBullets.add(bi);
        }
      });
      if (hit) score += 1;
      else remaining.push(en);
    }
    enemies = remaining;
    bullets = bullets.filter((_, bi) => !hitBullets.has(bi));

    for (const en of enemies) {
      if (
        Math.abs(enemyDisplayX(en) - playerX) < (PLAYER_W + ENEMY_SIZE) / 2.4 &&
        Math.abs(en.y - PLAYER_Y) < (PLAYER_H + ENEMY_SIZE) / 2.4
      ) {
        lives -= 1;
        en.y = CANVAS_H + 999;
      }
    }
    enemies = enemies.filter((en) => en.y < CANVAS_H + 100);

    if (score >= cfg.winScore) return true;
    if (lives <= 0) return false;
  }
  return false;
}

export function winRate(cfg, player, trials = 600) {
  let wins = 0;
  for (let i = 0; i < trials; i++) if (playOnce(cfg, player, 1000 + i * 7919)) wins++;
  return wins / trials;
}

/** 今の本番設定 */
export const CURRENT = {
  winScore: 10,
  startLives: 5,
  playerSpeed: 6,
  fireInterval: 180,
  spawnInterval: 950,
  speedMin: 1.1,
  speedSpread: 1.1,
  driftMin: 55,
  driftSpread: 45,
  dodgeStart: 160,
  hitTolX: 10,
  hitTolY: 12,
};

/** 初見プレイヤー: 反応が鈍く、先読みせず、狙う敵を間違え、時々手が止まる */
export const BEGINNER = {
  decisionInterval: 300,
  reactionMs: 340,
  aimNoise: 26,
  deadZone: 14,
  wrongTargetChance: 0.3,
  freezeChance: 0.12,
  freezeMs: 420,
};

/** 数回遊んで慣れた人（ここが低すぎると理不尽になる） */
export const ADEPT = {
  decisionInterval: 110,
  reactionMs: 160,
  aimNoise: 8,
  deadZone: 6,
  wrongTargetChance: 0.05,
  freezeChance: 0.02,
  freezeMs: 200,
};
