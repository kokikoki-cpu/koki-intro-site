"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { tryPassphrase, unlock, useIsUnlocked } from "@/lib/unlock";
import StampedeTransition from "@/components/StampedeTransition";

/** 解錠キー。合言葉で全解錠した場合もこれを満たす */
const GATE_ID = "gate";
const WIN_SCORE = 10;
/* 難易度は、ゲームロジックをそのまま再現したシミュレータで詰めた値。
   「初見の人が半分くらい勝てる」= 初見 53% / 数回遊んで慣れた人 75% を狙っている。
   どれか一つでも緩めると一気に簡単になるので、変えるときはセットで考えること。 */
const START_LIVES = 3;

const CANVAS_W = 360;
const CANVAS_H = 560;
const PLAYER_W = 34;
const PLAYER_H = 26;
const PLAYER_Y = CANVAS_H - 50;
const PLAYER_SPEED = 6;
const BULLET_SPEED = 8;
const FIRE_INTERVAL = 240;
const ENEMY_SPAWN_INTERVAL = 780;
const ENEMY_SIZE = 26;

const ENEMY_SPRITE_SRC = "/images/game/scammer.jpg";
const DODGE_START_Y = PLAYER_Y - 210;

const MAX_BULLETS = 36;
const MAX_ENEMIES = 22;
const MAX_BURSTS = 10;

type Bullet = { x: number; y: number };
type Enemy = {
  baseX: number;
  y: number;
  speed: number;
  driftDir: 1 | -1;
  driftAmp: number;
};
type Burst = { x: number; y: number; born: number };

function enemyDisplayX(en: Enemy): number {
  if (en.y <= DODGE_START_Y) return en.baseX;
  const progress = Math.min(1, (en.y - DODGE_START_Y) / (PLAYER_Y - DODGE_START_Y));
  /* 一度よけたあと、手元に来る直前で逆方向に切り返す（sin を 1.5π まで回す）。
     ただ追いかけるだけだと置いていかれるので、ここが難しさの中心。 */
  const shape = Math.sin(progress * Math.PI * 1.5);
  const x = en.baseX + en.driftDir * en.driftAmp * shape;
  return Math.max(ENEMY_SIZE / 2, Math.min(CANVAS_W - ENEMY_SIZE / 2, x));
}

type Phase = "intro" | "playing" | "won" | "lost";

// --- 2D ゲーム座標 → 3D ワールド座標 ------------------------------------
const LANE_WIDTH = 15;
const DEPTH = 46;
const worldX = (cx: number) => (cx / CANVAS_W - 0.5) * LANE_WIDTH;
const worldZ = (cy: number) => -DEPTH * (1 - cy / CANVAS_H);

const SKY_TOP = "#ff8a4c";
const SKY_MID = "#ffb457";
const SKY_BOTTOM = "#ffe08a";
const DUNE_COLOR = 0xe3a75c;
const PLAYER_GREEN = 0x39a862;
const ACCENT_CLAY = 0xff6f45;
const BULLET_YELLOW = 0xffe066;
const OUTLINE_INK = 0x241608;

function makeSkyTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, SKY_TOP);
  grad.addColorStop(0.55, SKY_MID);
  grad.addColorStop(1, SKY_BOTTOM);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  // ぼんやり太陽
  const sunGrad = ctx.createRadialGradient(size * 0.5, size * 0.72, 4, size * 0.5, size * 0.72, size * 0.4);
  sunGrad.addColorStop(0, "rgba(255,255,235,0.95)");
  sunGrad.addColorStop(1, "rgba(255,255,235,0)");
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addOutline(mesh: THREE.Mesh, scale = 1.08): THREE.Mesh {
  const outlineMat = new THREE.MeshBasicMaterial({ color: OUTLINE_INK, side: THREE.BackSide });
  const outline = new THREE.Mesh(mesh.geometry, outlineMat);
  outline.scale.setScalar(scale);
  return outline;
}

function buildDunes(): THREE.Mesh {
  const size = DEPTH * 2.6;
  const seg = 40;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h =
      Math.sin(x * 0.18 + 1.4) * 1.6 +
      Math.sin(y * 0.12 - 0.6) * 1.2 +
      Math.sin((x + y) * 0.06) * 0.9;
    pos.setZ(i, h);
  }
  geo.computeVertexNormals();
  const mat = new THREE.MeshPhongMaterial({ color: DUNE_COLOR, flatShading: true, shininess: 6 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = -2.4;
  mesh.position.z = -DEPTH * 0.4;
  return mesh;
}

function buildPlayer(): THREE.Group {
  const group = new THREE.Group();
  const bodyGeo = new THREE.ConeGeometry(1.15, 2.6, 8);
  const bodyMat = new THREE.MeshPhongMaterial({ color: PLAYER_GREEN, flatShading: true, shininess: 12 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.rotation.x = Math.PI / 2;
  body.add(addOutline(body, 1.1));
  group.add(body);

  const finGeo = new THREE.BoxGeometry(2.6, 0.18, 0.9);
  const finMat = new THREE.MeshPhongMaterial({ color: ACCENT_CLAY, flatShading: true, shininess: 12 });
  const fin = new THREE.Mesh(finGeo, finMat);
  fin.position.set(0, -0.15, 0.55);
  fin.add(addOutline(fin, 1.15));
  group.add(fin);

  const shadowGeo = new THREE.CircleGeometry(1.5, 24);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 });
  const shadow = new THREE.Mesh(shadowGeo, shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -1.15;
  group.add(shadow);

  return group;
}

function buildEnemyPool(): { groups: THREE.Group[]; sphereMat: THREE.MeshToonMaterial } {
  const sphereGeo = new THREE.SphereGeometry(1, 20, 16);
  const sphereMat = new THREE.MeshToonMaterial({ color: 0xf3ead9 });
  const groups: THREE.Group[] = [];
  for (let i = 0; i < MAX_ENEMIES; i++) {
    const g = new THREE.Group();
    const sphere = new THREE.Mesh(sphereGeo, sphereMat);
    sphere.add(addOutline(sphere, 1.06));
    g.add(sphere);
    g.visible = false;
    groups.push(g);
  }
  return { groups, sphereMat };
}

function buildBulletPool(): THREE.Mesh[] {
  const geo = new THREE.CapsuleGeometry(0.16, 0.5, 4, 8);
  const mat = new THREE.MeshBasicMaterial({ color: BULLET_YELLOW });
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < MAX_BULLETS; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = Math.PI / 2;
    m.visible = false;
    meshes.push(m);
  }
  return meshes;
}

function buildBurstPool(): THREE.Mesh[] {
  const geo = new THREE.RingGeometry(0.4, 0.62, 20);
  const mat = new THREE.MeshBasicMaterial({
    color: ACCENT_CLAY,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const meshes: THREE.Mesh[] = [];
  for (let i = 0; i < MAX_BURSTS; i++) {
    const m = new THREE.Mesh(geo, mat.clone());
    m.visible = false;
    meshes.push(m);
  }
  return meshes;
}

function buildMarkers(): THREE.Mesh[] {
  const geo = new THREE.ConeGeometry(0.4, 1.1, 5);
  const meshes: THREE.Mesh[] = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const color = i % 4 < 2 ? PLAYER_GREEN : ACCENT_CLAY;
    const mat = new THREE.MeshPhongMaterial({ color, flatShading: true, shininess: 6 });
    const m = new THREE.Mesh(geo, mat);
    m.position.set(side * (LANE_WIDTH / 2 + 1.4), -1.6, -((i * (DEPTH * 2.2)) / count));
    meshes.push(m);
  }
  return meshes;
}

export default function ShootingGameGate() {
  const gateOpen = useIsUnlocked(GATE_ID);
  const [dismissed, setDismissed] = useState(false);
  const [phase, setPhase] = useState<Phase>("intro");
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  /** 入口の文字だけの画面を抜けたか */
  const [welcomed, setWelcomed] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const playerX = useRef(CANVAS_W / 2);
  const moveDir = useRef(0);
  const bullets = useRef<Bullet[]>([]);
  const enemies = useRef<Enemy[]>([]);
  const bursts = useRef<Burst[]>([]);
  const lastFire = useRef(0);
  const lastSpawn = useRef(0);
  const rafId = useRef<number | null>(null);
  const scoreRef = useRef(0);
  const livesRef = useRef(START_LIVES);
  const phaseRef = useRef<Phase>("intro");

  // --- Three.js シーンのセットアップ（マウント時に1回だけ、フェーズが変わっても維持する） ---
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const skyTex = makeSkyTexture();
    scene.background = skyTex;
    scene.fog = new THREE.Fog(0xffb457, DEPTH * 0.55, DEPTH * 1.35);

    const camera = new THREE.PerspectiveCamera(52, CANVAS_W / CANVAS_H, 0.1, 200);
    camera.position.set(0, 7.6, 11);
    camera.lookAt(0, 0.5, -DEPTH * 0.35);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight(0xfff2d6, 0x7a4a2c, 1.05);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d0, 1.15);
    sun.position.set(-6, 10, 6);
    scene.add(sun);

    const dunes = buildDunes();
    scene.add(dunes);

    const markers = buildMarkers();
    markers.forEach((m) => scene.add(m));

    const player = buildPlayer();
    scene.add(player);

    const { groups: enemyGroups, sphereMat } = buildEnemyPool();
    enemyGroups.forEach((g) => scene.add(g));

    const bulletMeshes = buildBulletPool();
    bulletMeshes.forEach((m) => scene.add(m));

    const burstMeshes = buildBurstPool();
    burstMeshes.forEach((m) => scene.add(m));

    new THREE.TextureLoader().load(ENEMY_SPRITE_SRC, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      sphereMat.map = tex;
      sphereMat.needsUpdate = true;
    });

    const markerLoopLen = DEPTH * 2.2;

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
      const rect = mount!.getBoundingClientRect();
      const ratio = CANVAS_W / rect.width;
      return (clientX - rect.left) * ratio;
    }
    function onPointerMove(e: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      playerX.current = Math.max(
        PLAYER_W / 2,
        Math.min(CANVAS_W - PLAYER_W / 2, pointerToX(e.clientX))
      );
    }
    function onPointerDown(e: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      playerX.current = Math.max(
        PLAYER_W / 2,
        Math.min(CANVAS_W - PLAYER_W / 2, pointerToX(e.clientX))
      );
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);

    function loop(t: number) {
      rafId.current = requestAnimationFrame(loop);

      // レーン脇の目印は常にスクロール（スピード感の演出）
      markers.forEach((m) => {
        m.position.z += 0.55;
        if (m.position.z > 8) m.position.z -= markerLoopLen;
      });

      if (phaseRef.current === "playing") {
        // --- move player ---
        playerX.current = Math.max(
          PLAYER_W / 2,
          Math.min(CANVAS_W - PLAYER_W / 2, playerX.current + moveDir.current * PLAYER_SPEED)
        );

        // --- auto-fire ---
        if (t - lastFire.current > FIRE_INTERVAL) {
          bullets.current.push({ x: playerX.current, y: PLAYER_Y });
          lastFire.current = t;
        }

        // --- spawn enemies ---
        if (t - lastSpawn.current > ENEMY_SPAWN_INTERVAL) {
          enemies.current.push({
            baseX: ENEMY_SIZE / 2 + Math.random() * (CANVAS_W - ENEMY_SIZE),
            y: -ENEMY_SIZE,
            speed: 2.8 + Math.random() * 1.2,
            driftDir: Math.random() < 0.5 ? -1 : 1,
            driftAmp: 80 + Math.random() * 45,
          });
          lastSpawn.current = t;
        }

        // --- update bullets ---
        bullets.current = bullets.current
          .map((b) => ({ ...b, y: b.y - BULLET_SPEED }))
          .filter((b) => b.y > -10);

        // --- update enemies ---
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

        // --- bullet-enemy collision ---
        const remainingEnemies: Enemy[] = [];
        const hitBulletIdx = new Set<number>();
        for (const en of enemies.current) {
          let hit = false;
          const enX = enemyDisplayX(en);
          bullets.current.forEach((b, bi) => {
            if (hitBulletIdx.has(bi) || hit) return;
            const dx = b.x - enX;
            const dy = b.y - en.y;
            // 弾（幅4px）と敵（直径26px）の実寸に近い判定。緩めると途端に簡単になる
            if (Math.abs(dx) < ENEMY_SIZE / 2 + 3 && Math.abs(dy) < ENEMY_SIZE / 2 + 7) {
              hit = true;
              hitBulletIdx.add(bi);
            }
          });
          if (hit) {
            scoreRef.current += 1;
            setScore(scoreRef.current);
            bursts.current.push({ x: enX, y: en.y, born: t });
          } else {
            remainingEnemies.push(en);
          }
        }
        enemies.current = remainingEnemies;
        bullets.current = bullets.current.filter((_, bi) => !hitBulletIdx.has(bi));

        // --- player-enemy collision ---
        for (const en of enemies.current) {
          const dx = Math.abs(enemyDisplayX(en) - playerX.current);
          const dy = Math.abs(en.y - PLAYER_Y);
          if (dx < (PLAYER_W + ENEMY_SIZE) / 2.4 && dy < (PLAYER_H + ENEMY_SIZE) / 2.4) {
            livesRef.current -= 1;
            setLives(livesRef.current);
            en.y = CANVAS_H + 999;
          }
        }
        enemies.current = enemies.current.filter((en) => en.y < CANVAS_H + 100);

        bursts.current = bursts.current.filter((b) => t - b.born < 380);

        if (scoreRef.current >= WIN_SCORE) {
          phaseRef.current = "won";
          setPhase("won");
          // 勝ちを即座に記録する。この後に動画を見せるので、画面自体はまだ閉じない
          unlock(GATE_ID);
        } else if (livesRef.current <= 0) {
          phaseRef.current = "lost";
          setPhase("lost");
        }
      }

      // --- プレイヤーの見た目（アイドル中も少し揺れる） ---
      const idleBob = Math.sin(t * 0.0025) * 0.12;
      player.position.set(worldX(playerX.current), idleBob, worldZ(PLAYER_Y));
      player.rotation.z = -moveDir.current * 0.28;
      player.rotation.y = phaseRef.current === "playing" ? 0 : Math.sin(t * 0.0012) * 0.5;

      // --- 敵 ---
      for (let i = 0; i < enemyGroups.length; i++) {
        const g = enemyGroups[i];
        const en = enemies.current[i];
        if (!en) {
          g.visible = false;
          continue;
        }
        g.visible = true;
        const ex = enemyDisplayX(en);
        g.position.set(worldX(ex), 0.4 + Math.sin(t * 0.004 + i) * 0.25, worldZ(en.y));
        const scale = ENEMY_SIZE / 26;
        g.scale.setScalar(scale);
        g.rotation.y += 0.02;
      }

      // --- 弾 ---
      for (let i = 0; i < bulletMeshes.length; i++) {
        const m = bulletMeshes[i];
        const b = bullets.current[i];
        if (!b) {
          m.visible = false;
          continue;
        }
        m.visible = true;
        m.position.set(worldX(b.x), 0.2, worldZ(b.y));
      }

      // --- 撃破エフェクト ---
      for (let i = 0; i < burstMeshes.length; i++) {
        const m = burstMeshes[i];
        const b = bursts.current[i];
        if (!b) {
          m.visible = false;
          continue;
        }
        const age = t - b.born;
        m.visible = true;
        m.position.set(worldX(b.x), 0.5, worldZ(b.y));
        m.lookAt(camera.position);
        const growth = 1 + age / 160;
        m.scale.setScalar(growth);
        const mat = m.material as THREE.MeshBasicMaterial;
        mat.opacity = Math.max(0, 1 - age / 380);
      }

      renderer.render(scene, camera);
    }
    rafId.current = requestAnimationFrame(loop);

    const resizeObserver = new ResizeObserver(() => {
      if (!mount) return;
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    resizeObserver.observe(mount);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      resizeObserver.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      skyTex.dispose();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
          else mat.dispose();
        }
      });
      mount.removeChild(renderer.domElement);
    };
  }, []);

  const resetGame = () => {
    playerX.current = CANVAS_W / 2;
    bullets.current = [];
    enemies.current = [];
    bursts.current = [];
    scoreRef.current = 0;
    livesRef.current = START_LIVES;
    setScore(0);
    setLives(START_LIVES);
    phaseRef.current = "playing";
    setPhase("playing");
  };

  const checkPassphrase = () => {
    if (tryPassphrase(passInput)) {
      setDismissed(true);
    } else {
      setPassError(true);
    }
  };

  /** 入口からそのままゲームへ入る（説明画面は挟まない） */
  const startFromWelcome = () => {
    setWelcomed(true);
    resetGame();
  };

  // 動画を止めてから場面転換に入る（暗転の裏で音だけ鳴り続けないように）
  const startTransition = () => {
    videoRef.current?.pause();
    setTransitioning(true);
  };
  const handleTransitionDone = useCallback(() => setDismissed(true), []);

  // クリア直後だけは、解錠済みでもご褒美動画の画面を出し続ける
  if (dismissed || (gateOpen && phase !== "won")) return null;

  if (phase === "won") {
    // 転換中は動画画面を外す。残しておくと、砂ぼこりが晴れる瞬間に
    // サイトではなく黒い動画画面が一瞬見えてしまう
    if (transitioning) return <StampedeTransition onDone={handleTransitionDone} />;

    return (
      <>
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-(--color-ink) px-4 py-6 text-(--color-white)">
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
            onClick={startTransition}
            className="rounded-full bg-(--color-accent) px-8 py-3 font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
          >
            {videoEnded ? "サイトへ進む →" : "スキップしてサイトへ →"}
          </button>
        </div>
      </>
    );
  }

  /* 入口。文字だけを順に浮かび上がらせて「何が始まるのか」と思わせる。
     3Dシーンは下でマウントしたまま覆うので、開始した瞬間からすぐ動く */
  if (!welcomed) {
    return (
      <div className="fixed inset-0 z-110 flex flex-col items-center justify-center gap-8 overflow-y-auto bg-(--color-ink) px-6 py-10 text-center text-(--color-white)">
        <div className="flex max-w-lg flex-col gap-5">
          <p
            className="welcome__line font-display text-xl font-bold leading-relaxed md:text-2xl"
            style={{ animationDelay: "0.25s" }}
          >
            こうきの自己紹介サイトへようこそ
          </p>
          <p
            className="welcome__line font-display text-xl font-bold leading-relaxed md:text-2xl"
            style={{ animationDelay: "1.5s" }}
          >
            まずは、肩慣らし、
            <br className="md:hidden" />
            エチオピアの詐欺師を撃退しよう
          </p>
        </div>

        <button
          onClick={startFromWelcome}
          className="welcome__hint rounded-full bg-(--color-accent) px-12 py-4 text-lg font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
          style={{ animationDelay: "2.9s" }}
        >
          ゲームスタート
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-(--color-ink) px-4 py-6 text-(--color-white)">
      <p className="text-center font-display text-2xl font-bold">Who am I ?</p>

      {phase === "intro" && (
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <div className="w-full rounded-lg border-2 border-(--color-accent) bg-(--color-accent-dark)/25 px-5 py-4">
            <p className="text-sm text-(--color-bg-soft)">
              {WIN_SCORE}体撃退でクリア（残機{START_LIVES}）
              <br />
              PC: ←→ または A/D キーで移動（弾は自動）
              <br />
              スマホ: 画面を指でなぞって移動
            </p>
          </div>
          <button
            onClick={resetGame}
            className="rounded-full bg-(--color-accent) px-10 py-3.5 text-lg font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
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
        <div
          ref={mountRef}
          className="touch-none overflow-hidden rounded-lg border-2 border-(--color-line) bg-black"
          // 画面が低いときも縦長キャンバスが収まるよう、高さを基準に決める
          style={{
            height: "min(56vh, 560px)",
            width: "auto",
            maxWidth: "88vw",
            aspectRatio: `${CANVAS_W}/${CANVAS_H}`,
          }}
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
