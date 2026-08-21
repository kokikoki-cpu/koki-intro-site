"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { tryPassphrase, unlock, useIsUnlocked } from "@/lib/unlock";
import { clearRate } from "@/lib/difficulty";
import { preloadSfx, sfx } from "@/lib/sfx";
import StampedeTransition from "@/components/StampedeTransition";
import SpaceBackdrop from "@/components/SpaceBackdrop";
import { PAL, addNightLights, nightSkyTexture } from "@/components/games/three-kit";

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

/* 夜の砂漠。サイト全体が夜空になったので、ここも夜に揃える（2026-08-20の決定）。
   色は globals.css のトークン / three-kit の PAL から外さない:
   以前は空 #ff8a4c〜#ffe08a・砂 #e3a75c・弾 #ffe066（黄）・目印 #ff6f45 という
   パレット外の原色で、サイトで唯一「昼」の画面になっていた。 */
const DUNE_COLOR = PAL.sandNight;
/* 自機は人。夜の砂の上で沈まないよう、服は生成り側に置く */
const PLAYER_CLOTH = 0xe8dcc6;
const MARKER_CLAY = PAL.clay;
/* 弾は ember。この画面の光源と同じ色にして「光り物を増やさない」 */
const BULLET_EMBER = PAL.ember;
const OUTLINE_INK = 0x241608;

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
  const skin = 0xf0dcc0;
  const cloth = PLAYER_CLOTH;

  const add = (mesh: THREE.Mesh, outline = 1.1) => {
    mesh.add(addOutline(mesh, outline));
    group.add(mesh);
    return mesh;
  };

  // 頭
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 14, 12),
    new THREE.MeshPhongMaterial({ color: skin, flatShading: true, shininess: 8 })
  );
  head.position.y = 1.85;
  add(head, 1.09);

  // 胴
  const torso = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.46, 0.9, 4, 10),
    new THREE.MeshPhongMaterial({ color: cloth, flatShading: true, shininess: 10 })
  );
  torso.position.y = 0.92;
  add(torso, 1.07);

  // 両腕（前へ構える）
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.16, 0.7, 3, 8),
      new THREE.MeshPhongMaterial({ color: skin, flatShading: true, shininess: 8 })
    );
    arm.position.set(side * 0.5, 1.12, -0.34);
    arm.rotation.x = -1.15;
    add(arm, 1.12);
  }

  // 両脚
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.19, 0.72, 3, 8),
      new THREE.MeshPhongMaterial({ color: MARKER_CLAY, flatShading: true, shininess: 8 })
    );
    leg.position.set(side * 0.22, 0.1, 0);
    add(leg, 1.12);
  }

  // 影
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.8, 22),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.26 })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = -0.42;
  group.add(shadow);

  return group;
}

/* 敵の球は **ライティングを受けない材質** にする。
   夜のシーンで MeshToonMaterial にすると顔写真が沈んで「見えない」と言われた。
   狙う対象が見えないのは難しさではなく事故なので、敵だけは常に同じ明るさで出す。 */
function buildEnemyPool(): { groups: THREE.Group[]; sphereMat: THREE.MeshBasicMaterial } {
  const sphereGeo = new THREE.SphereGeometry(1, 20, 16);
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
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
  const mat = new THREE.MeshBasicMaterial({ color: BULLET_EMBER });
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
    color: MARKER_CLAY,
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
    const color = i % 4 < 2 ? PAL.nebula : MARKER_CLAY;
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
  /* 前口上を最後まで見なくても入れるように、どこかを押したら手前のボタンを即出す */
  const [openingRushed, setOpeningRushed] = useState(false);
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
    const skyTex = nightSkyTexture({ glow: 0.46 });
    scene.background = skyTex;
    /* 霧の色は空の地平線側と同じ。ここだけ明るいと奥に膜が張ったように見える */
    scene.fog = new THREE.Fog(0x141c26, DEPTH * 0.5, DEPTH * 1.4);

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

    /* 夜だが、狙って撃つゲームなので地形と自機が読める明るさは確保する */
    addNightLights(scene, 1.55);

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
            sfx("hit");
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
      // 動いている間は足踏み、止まっていると軽く息をする
      const moving = moveDir.current !== 0;
      const bob = moving ? Math.abs(Math.sin(t * 0.017)) * 0.2 : Math.sin(t * 0.0025) * 0.07;
      player.position.set(worldX(playerX.current), bob, worldZ(PLAYER_Y));
      player.rotation.z = -moveDir.current * 0.12;
      player.rotation.y = moveDir.current * 0.35;

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

  /* ゲートは GameShell を通らないので、効果音の先読みはここでやる。
     ただしマウント時ではなく、ゲームが始まってから（トップページに常駐しているので、
     マウント時に読むとオープニングの初期表示と帯域を取り合う） */
  useEffect(() => {
    if (phase === "playing") preloadSfx();
  }, [phase]);

  /* キーボードでも前口上を飛ばせるようにする（クリックと同じ扱い） */
  useEffect(() => {
    if (welcomed || openingRushed) return;
    const onKey = () => setOpeningRushed(true);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [welcomed, openingRushed]);

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
        <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-(--color-space) px-4 py-6 text-(--color-white)">
          <p className="font-display text-2xl font-extrabold">CLEAR!</p>
          <p className="text-center text-sm text-(--color-bg-soft)">
            へぇ 案外やるじゃん
            <br />
            ご褒美にモンゴルの牛動画をプレゼントフォーユー
          </p>
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
            className="btn-ember btn-ember--solid px-8 py-3"
          >
            {videoEnded ? "サイトへ進む →" : "スキップしてサイトへ →"}
          </button>
        </div>
      </>
    );
  }

  /* 入口。文字だけを順に浮かび上がらせて「何が始まるのか」と思わせる。
     ここで early return してはいけない: キャンバスがDOMに無いまま
     Three.js の初期化が走り、二度と作られなくなる（実際にゲームが動かなくなった）。
     必ず本体を描いたうえで、その「上に重ねる」こと。 */
  const welcomeOverlay = !welcomed ? (
      <div
        className="opening fixed inset-0 z-110 overflow-hidden text-center text-(--color-white)"
        onClick={() => setOpeningRushed(true)}
      >
        <SpaceBackdrop scenery="void" />

        <p className="opening__prologue font-display text-base font-extrabold tracking-[0.18em] md:text-lg">
          ずっと前、はるか遠くの国で──
        </p>

        <p className="opening__mark font-display text-5xl font-extrabold tracking-wide md:text-7xl">
          Who am I ?
        </p>

        <div className="opening__stage" aria-hidden="true">
          <div className="opening__plane">
          <div className="opening__crawl font-display text-base font-extrabold leading-loose md:text-3xl">
            <p>これは、四十の国を歩いた男の話。</p>
            <p className="pt-[1.2em]">
              砂漠では詐欺師に囲まれ、
              <br />
              草原では牛の群れに追われ、
              <br />
              それでもまだ、
              <br className="md:hidden" />
              次の地図を広げている。
            </p>
            <p className="pt-[1.2em]">
              彼が何者かは、
              <br />
              勝ち取らないと分からない。
            </p>
            <p className="pt-[1.2em]">
              すべての記憶を集めた者には、
              <br />
              こうきから豪華賞品が贈られる。
            </p>
            <p className="pt-[1.2em]">
              まずは肩慣らし。
              <br />
              エチオピアの詐欺師を撃退せよ。
            </p>
          </div>
          </div>
        </div>

        <div className="opening__veil" aria-hidden="true" />

        <div className="absolute inset-x-0 bottom-[12vh] flex justify-center">
          <button
            onClick={startFromWelcome}
            className={`opening__start rounded-md border-2 border-(--color-ember) px-10 py-3.5 font-display text-lg font-extrabold text-(--color-ember) transition hover:bg-(--color-ember) hover:text-(--color-space) ${
              openingRushed ? "opening__start--now" : ""
            }`}
          >
            ゲームスタート
          </button>
        </div>
      </div>
  ) : null;

  return (
    <>
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 overflow-y-auto bg-(--color-space) px-4 py-6 text-(--color-white)">
      <p className="text-center font-display text-2xl font-extrabold">Who am I ?</p>

      {phase === "intro" && (
        <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
          <p className="text-lg tracking-[0.3em] text-(--color-ember)" aria-label="難易度 3 / 5">
            ★★★<span className="text-(--color-white)/25">★★</span>
          </p>
          {/* ここだけは実測値。tools/sim-gate.mjs の初心者モデルで計測してある */}
          <p className="m-0 flex items-baseline gap-1.5">
            <span className="text-xs font-bold text-(--color-bg-soft)/70">初回クリア率</span>
            <span className="font-display text-2xl font-extrabold leading-none text-(--color-ember)">
              {clearRate(GATE_ID, 3).percent}
              <span className="text-sm">%</span>
            </span>
          </p>
          <div className="w-full rounded-md border-2 border-(--color-nebula) bg-(--color-space)/70 px-5 py-4">
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
            className="btn-ember btn-ember--solid px-10 py-3.5 text-lg"
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
            <p className="font-display text-2xl font-extrabold text-(--color-white)">GAME OVER</p>
            <button
              onClick={resetGame}
              className="btn-ember px-6 py-2 text-sm"
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
                className="btn-ember px-4 py-2 text-sm"
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

    {welcomeOverlay}
    </>
  );
}
