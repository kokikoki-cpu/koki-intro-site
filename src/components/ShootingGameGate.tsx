"use client";

import { useEffect, useRef, useState } from "react";

const PASSPHRASE = "こうきいつもありがとう";
const STORAGE_KEY = "koki-gate-unlocked";
const WIN_SCORE = 10;
const START_LIVES = 5;

const CANVAS_W = 360;
const CANVAS_H = 560;
const PLAYER_W = 34;
const PLAYER_H = 26;
const PLAYER_Y = CANVAS_H - 50;
const PLAYER_SPEED = 6;
const BULLET_SPEED = 8;
const FIRE_INTERVAL = 180;
const ENEMY_SPAWN_INTERVAL = 950;
const ENEMY_SIZE = 26;

type Bullet = { x: number; y: number };
type Enemy = {
  baseX: number;
  y: number;
  speed: number;
  driftDir: 1 | -1;
  driftAmp: number;
};

const ENEMY_SPRITE_SRC = "/images/game/scammer.jpg";
const DODGE_START_Y = PLAYER_Y - 160;

function enemyDisplayX(en: Enemy): number {
  if (en.y <= DODGE_START_Y) return en.baseX;
  const progress = Math.min(1, (en.y - DODGE_START_Y) / (PLAYER_Y - DODGE_START_Y));
  const eased = progress * progress; // 際どく近づくほど大きく横にそれる
  const x = en.baseX + en.driftDir * en.driftAmp * eased;
  return Math.max(ENEMY_SIZE / 2, Math.min(CANVAS_W - ENEMY_SIZE / 2, x));
}

type Phase = "intro" | "playing" | "won" | "lost";

export default function ShootingGameGate() {
  const [checked, setChecked] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spriteRef = useRef<HTMLImageElement | null>(null);
  const playerX = useRef(CANVAS_W / 2);
  const moveDir = useRef(0);
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const lastFire = useRef(0);
  const lastSpawn = useRef(0);
  const rafId = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(START_LIVES);
  const phaseRef = useRef<Phase>("intro");

  useEffect(() => {
    const isUnlocked = window.sessionStorage.getItem(STORAGE_KEY) === "1";
    if (isUnlocked) setDismissed(true);
    setChecked(true);

    const img = new window.Image();
    img.src = ENEMY_SPRITE_SRC;
    img.onload = () => {
      spriteRef.current = img;
    };
    img.onerror = () => {
      spriteRef.current = null;
    };
  }, []);

  // 記録だけ残す（このプレイでは動画を見せるので、まだ画面は閉じない）
  const persistUnlock = () => {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  };

  const resetGame = () => {
    playerX.current = CANVAS_W / 2;
    bullets.current = [];
    enemies.current = [];
    scoreRef.current = 0;
    livesRef.current = START_LIVES;
    setScore(0);
    setLives(START_LIVES);
    phaseRef.current = "playing";
    setPhase("playing");
  };

  useEffect(() => {
    if (phase !== "playing") return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") moveDir.current = -1;
      if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") moveDir.current = 1;
    }
    function onKeyUp(e: KeyboardEvent) {
      if (["ArrowLeft", "a", "A", "ArrowRight", "d", "D"].includes(e.key)) {
        moveDir.current = 0;
      }
    }
    function pointerToX(clientX: number) {
      const rect = canvas!.getBoundingClientRect();
      const ratio = CANVAS_W / rect.width;
      return (clientX - rect.left) * ratio;
    }
    function onPointerMove(e: PointerEvent) {
      playerX.current = Math.max(
        PLAYER_W / 2,
        Math.min(CANVAS_W - PLAYER_W / 2, pointerToX(e.clientX))
      );
    }
    function onPointerDown(e: PointerEvent) {
      playerX.current = Math.max(
        PLAYER_W / 2,
        Math.min(CANVAS_W - PLAYER_W / 2, pointerToX(e.clientX))
      );
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);

    function loop(t: number) {
      if (phaseRef.current !== "playing" || !ctx) return;

      // move player
      playerX.current = Math.max(
        PLAYER_W / 2,
        Math.min(CANVAS_W - PLAYER_W / 2, playerX.current + moveDir.current * PLAYER_SPEED)
      );

      // auto-fire
      if (t - lastFire.current > FIRE_INTERVAL) {
        bullets.current.push({ x: playerX.current, y: PLAYER_Y });
        lastFire.current = t;
      }

      // spawn enemies
      if (t - lastSpawn.current > ENEMY_SPAWN_INTERVAL) {
        enemies.current.push({
          baseX: ENEMY_SIZE / 2 + Math.random() * (CANVAS_W - ENEMY_SIZE),
          y: -ENEMY_SIZE,
          speed: 1.1 + Math.random() * 1.1,
          driftDir: Math.random() < 0.5 ? -1 : 1,
          driftAmp: 55 + Math.random() * 45,
        });
        lastSpawn.current = t;
      }

      // update bullets
      bullets.current = bullets.current
        .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
        .filter((b) => b.y > -10);

      // update enemies
      const survivors: Enemy[] = [];
      for (const en of enemies.current) {
        const ny = en.y + en.speed;
        if (ny > CANVAS_H) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          continue;
        }
        survivors.push({ ...en, y: ny });
      }
      enemies.current = survivors;

      // bullet-enemy collision
      const remainingEnemies: Enemy[] = [];
      const hitBulletIdx = new Set<number>();
      for (const en of enemies.current) {
        let hit = false;
        const enX = enemyDisplayX(en);
        bullets.current.forEach((b, bi) => {
          if (hitBulletIdx.has(bi) || hit) return;
          const dx = b.x - enX;
          const dy = b.y - en.y;
          if (Math.abs(dx) < ENEMY_SIZE / 2 + 10 && Math.abs(dy) < ENEMY_SIZE / 2 + 12) {
            hit = true;
            hitBulletIdx.add(bi);
          }
        });
        if (hit) {
          scoreRef.current += 1;
          setScore(scoreRef.current);
        } else {
          remainingEnemies.push(en);
        }
      }
      enemies.current = remainingEnemies;
      bullets.current = bullets.current.filter((_, bi) => !hitBulletIdx.has(bi));

      // player-enemy collision
      for (const en of enemies.current) {
        const dx = Math.abs(enemyDisplayX(en) - playerX.current);
        const dy = Math.abs(en.y - PLAYER_Y);
        if (dx < (PLAYER_W + ENEMY_SIZE) / 2.4 && dy < (PLAYER_H + ENEMY_SIZE) / 2.4) {
          livesRef.current -= 1;
          setLives(livesRef.current);
          en.y = CANVAS_H + 999; // mark for removal next frame
        }
      }
      enemies.current = enemies.current.filter((en) => en.y < CANVAS_H + 100);

      if (scoreRef.current >= WIN_SCORE) {
        phaseRef.current = "won";
        setPhase("won");
        persistUnlock();
      } else if (livesRef.current <= 0) {
        phaseRef.current = "lost";
        setPhase("lost");
      }

      // draw
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = "#12140f";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = "#a85630";
      bullets.current.forEach((b) => {
        ctx.fillRect(b.x - 2, b.y - 8, 4, 10);
      });

      const sprite = spriteRef.current;
      enemies.current.forEach((en) => {
        const enX = enemyDisplayX(en);
        const r = ENEMY_SIZE / 2;
        if (sprite) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(enX, en.y, r, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();
          ctx.drawImage(sprite, enX - r, en.y - r, r * 2, r * 2);
          ctx.restore();
          ctx.beginPath();
          ctx.arc(enX, en.y, r, 0, Math.PI * 2);
          ctx.strokeStyle = "#e5e0d2";
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.fillStyle = "#e5e0d2";
          ctx.beginPath();
          ctx.arc(enX, en.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.fillStyle = "#3f5c43";
      ctx.beginPath();
      ctx.moveTo(playerX.current, PLAYER_Y - PLAYER_H / 2);
      ctx.lineTo(playerX.current - PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2);
      ctx.lineTo(playerX.current + PLAYER_W / 2, PLAYER_Y + PLAYER_H / 2);
      ctx.closePath();
      ctx.fill();

      rafId.current = requestAnimationFrame(loop);
    }

    rafId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [phase]);

  const checkPassphrase = () => {
    if (passInput.trim() === PASSPHRASE) {
      persistUnlock();
      setDismissed(true);
    } else {
      setPassError(true);
    }
  };

  if (!checked || dismissed) return null;

  if (phase === "won") {
    return (
      <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 bg-(--color-ink) px-4 py-6 text-(--color-white)">
        <p className="font-display text-2xl font-bold">CLEAR!</p>
        <p className="text-sm text-(--color-bg-soft)">よくやった。ご褒美にモンゴルの旅動画をどうぞ。</p>
        <video
          ref={videoRef}
          src="/videos/mongolia.mp4"
          controls
          autoPlay
          playsInline
          onEnded={() => setVideoEnded(true)}
          className="max-h-[60vh] w-full max-w-md rounded-lg border-2 border-(--color-line) bg-black"
        />
        <button
          onClick={() => setDismissed(true)}
          className="rounded-full bg-(--color-accent) px-8 py-3 font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
        >
          {videoEnded ? "サイトへ進む →" : "スキップしてサイトへ →"}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 bg-(--color-ink) px-4 py-6 text-(--color-white)">
      <p className="text-center font-display text-2xl font-bold">I am KOKI</p>

      {phase === "intro" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="max-w-xs text-sm text-(--color-bg-soft)">
            この先を見るには、まず腕試し。
            <br />
            エチオピアの詐欺師たちを{WIN_SCORE}体撃退せよ。
          </p>
          <p className="text-xs text-(--color-bg-soft)/70">
            PC: ←→ または A/D で移動（自動発射） ／ スマホ: 画面をドラッグ
          </p>
          <button
            onClick={resetGame}
            className="rounded-full bg-(--color-accent) px-8 py-3 font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
          >
            ゲームスタート
          </button>
        </div>
      )}

      {(phase === "playing" || phase === "lost") && (
        <div className="flex items-center gap-6 text-sm font-bold">
          <span>撃退: {score} / {WIN_SCORE}</span>
          <span>残機: {"●".repeat(Math.max(lives, 0))}{"○".repeat(Math.max(START_LIVES - lives, 0))}</span>
        </div>
      )}

      <div className="relative">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="touch-none rounded-lg border-2 border-(--color-line) bg-black"
          style={{ width: "min(88vw, 360px)", height: "auto", aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        />

        {phase === "lost" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/75 text-center">
            <p className="font-display text-2xl font-bold text-(--color-white)">GAME OVER</p>
            <button
              onClick={resetGame}
              className="rounded-full bg-(--color-accent) px-6 py-2 text-sm font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
            >
              もう一度
            </button>
          </div>
        )}
      </div>

      <div className="mt-1 text-center">
        {!showPassphrase ? (
          <button
            onClick={() => setShowPassphrase(true)}
            className="text-xs text-(--color-bg-soft)/70 underline underline-offset-2"
          >
            クリアできない人は合言葉を入れるとスキップできるよ♡
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              <input
                value={passInput}
                onChange={(e) => {
                  setPassInput(e.target.value);
                  setPassError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && checkPassphrase()}
                placeholder="合言葉"
                className="rounded-full border border-(--color-line) bg-(--color-white) px-4 py-2 text-sm text-(--color-ink) outline-none"
              />
              <button
                onClick={checkPassphrase}
                className="rounded-full bg-(--color-accent) px-4 py-2 text-sm font-bold text-(--color-white)"
              >
                入る
              </button>
            </div>
            {passError && (
              <p className="text-xs text-(--color-clay)">合言葉が違います</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
