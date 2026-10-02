"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import GameShell from "./GameShell";
import {
  PAL,
  addNightLights,
  createStage,
  lowPolyGround,
  outlineFor,
  nightSkyTexture,
  toonMat,
  type GamePhase,
} from "./three-kit";

/** 壁の並ぶ道の左右の端 */
const ROAD_HALF = 7.4;
/** 自機の半幅。壁のすき間との当たり判定に使う */
const RUNNER_HALF = 0.62;

const PLAYER_Z = 0;
const SPAWN_Z = -78;
/** 関門ひとつあたりの壁の数。この数を抜けるとゲートが出る */
const WALLS_PER_GATE = 2;

/**
 * **2026-08-26に大幅に緩めた。** 経歴6つ ＝ 壁18枚を1ミスも許さず抜ける設計になっていて、
 * 難しすぎるという声が来たため。壁を12枚に減らし、すき間を広げ、速度の上がり方を鈍らせ、
 * **残機を3にして「かすったら全部やり直し」をやめた。**
 *
 * | | 変更前 | 変更後 |
 * |---|---|---|
 * | 壁の数（関門あたり） | 3 | 2 |
 * | すき間の初期値 | 3.5 | 4.4 |
 * | 関門ごとの狭まり | 0.27 | 0.14 |
 * | すき間の下限 | 2.0 | 3.0 |
 * | 初速 | 0.58 | 0.48 |
 * | 関門ごとの加速 | 0.062 | 0.032 |
 * | 残機 | なし | 3 |
 *
 * 走者の半幅は 0.62 なので、最後の関門でも すき間3.7 ÷ 2 − 0.62 ＝ 左右1.23 の余裕が残る
 * （変更前は 2.15 ÷ 2 − 0.62 ＝ 0.45 しかなかった）。
 */
const START_LIVES = 3;

const BASE_SPEED = 0.48;
const SPEED_PER_GATE = 0.032;
const BASE_GAP = 4.4;
const GAP_PER_GATE = 0.14;
/** これ以上は詰めない（詰めすぎると運ゲーになる） */
const MIN_GAP = 3.0;

const SPAWN_GAP_Z = 15.5;

/**
 * 触る端末か。すでにスマホの人に「スマホでやれ」と出すのは無意味なので分ける。
 * 描画中に評価するが、助け船を出すのは5回落ちたあとで、初回描画は必ず出さないので
 * サーバ側の描画とずれない。
 */
function isTouchDevice(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
}

type Item = {
  kind: "wall" | "gate";
  group: THREE.Group;
  prevZ: number;
  gapCenter: number;
  gapWidth: number;
};

export default function CareerRunGame({
  steps,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  steps: string[];
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const total = steps.length;

  const [phase, setPhase] = useState<GamePhase>("intro");
  const [reached, setReached] = useState(0);
  const [lives, setLives] = useState(START_LIVES);
  /** ぶつかった直後だけ出す表示。残機が減ったことを黙って進めると理不尽に見える */
  const [bumped, setBumped] = useState(false);

  /**
   * 何回落ちたか（残機を使い切った回数）。続けて落ちている人には操作の逃げ道を教える。
   * マウスは「動かした量」でしか狙えないが、指なら画面の位置をそのまま指せるので、
   * このゲームはスマホの方が素直に当たる（pointermove を直接 x に流している）。
   */
  const [fails, setFails] = useState(0);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>("intro");
  const reachedRef = useRef(0);
  const livesRef = useRef(START_LIVES);
  const bumpTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetSignal = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const goal = steps.length;

    const stage = createStage(mount, { fov: 60, far: 240 });
    const { scene, camera, renderer } = stage;

    /* 夜の空へ統一（2026-08-20）。空・光は全ゲーム共通の three-kit を使う */
    scene.background = nightSkyTexture({ glow: 0.5, seed: 90211 });
    scene.fog = new THREE.Fog(0x131b25, 40, 96);
    addNightLights(scene);

    camera.position.set(0, 3.4, 8.2);
    camera.lookAt(0, 1.2, -20);

    // --- 地面と道 ---
    scene.add(lowPolyGround({ color: PAL.sandNight, size: 220, amp: 1.1, y: -1.6, z: -70 }));

    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(ROAD_HALF * 2 + 1.4, 240),
      toonMat(0xd8caae, 3)
    );
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.55, -100);
    scene.add(road);

    const edgeGeo = new THREE.BoxGeometry(0.22, 0.22, 240);
    for (const x of [-ROAD_HALF - 0.5, ROAD_HALF + 0.5]) {
      const e = new THREE.Mesh(edgeGeo, toonMat(PAL.ink, 2));
      e.position.set(x, -0.45, -100);
      scene.add(e);
    }

    // --- 走者 ---
    const runner = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.95, 4, 10), toonMat(PAL.accent, 14));
    body.position.y = 0.75;
    body.add(outlineFor(body, 1.09));
    runner.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 12), toonMat(0xf0e3cd, 12));
    head.position.y = 1.72;
    head.add(outlineFor(head, 1.09));
    runner.add(head);
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.62, 20),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.24 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = -0.5;
    runner.add(shadow);
    runner.position.set(0, 0, PLAYER_Z);
    scene.add(runner);

    // --- 壁とゲート ---
    const wallGeo = new THREE.BoxGeometry(1, 2.4, 0.85);
    const gateGeo = new THREE.TorusGeometry(3.5, 0.2, 8, 26);
    const items: Item[] = [];

    let spawnIndex = 0;
    let nextSpawnZ = SPAWN_Z;

    function currentSpeed() {
      return BASE_SPEED + reachedRef.current * SPEED_PER_GATE;
    }
    function currentGap() {
      return Math.max(MIN_GAP, BASE_GAP - reachedRef.current * GAP_PER_GATE);
    }

    function buildWall(gapCenter: number, gapWidth: number): THREE.Group {
      const g = new THREE.Group();
      const leftEdge = gapCenter - gapWidth / 2;
      const rightEdge = gapCenter + gapWidth / 2;

      const segments: [number, number][] = [
        [-ROAD_HALF, leftEdge],
        [rightEdge, ROAD_HALF],
      ];
      for (const [from, to] of segments) {
        const w = to - from;
        if (w <= 0.05) continue;
        const m = new THREE.Mesh(wallGeo, toonMat(PAL.clay, 10));
        m.scale.x = w;
        m.position.set(from + w / 2, 0.9, 0);
        m.add(outlineFor(m, 1.04));
        g.add(m);
      }
      return g;
    }

    function spawn() {
      const isGate = spawnIndex % (WALLS_PER_GATE + 1) === WALLS_PER_GATE;
      const gapWidth = currentGap();
      // すき間は道幅の中に必ず収める
      const limit = ROAD_HALF - gapWidth / 2;
      const gapCenter = (Math.random() * 2 - 1) * limit;

      let group: THREE.Group;
      if (isGate) {
        group = new THREE.Group();
        const torus = new THREE.Mesh(gateGeo, toonMat(PAL.accent, 16));
        torus.position.y = 1.5;
        torus.add(outlineFor(torus, 1.05));
        group.add(torus);
      } else {
        group = buildWall(gapCenter, gapWidth);
      }
      group.position.z = nextSpawnZ;
      scene.add(group);
      items.push({
        kind: isGate ? "gate" : "wall",
        group,
        prevZ: nextSpawnZ,
        gapCenter,
        gapWidth,
      });

      spawnIndex += 1;
      nextSpawnZ -= SPAWN_GAP_Z;
    }

    function clearItems() {
      for (const it of items) scene.remove(it.group);
      items.length = 0;
      spawnIndex = 0;
      nextSpawnZ = SPAWN_Z;
    }

    // --- 入力 ---
    const targetX = { v: 0 };
    const keyDir = { v: 0 };

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a") keyDir.v = -1;
      if (e.key === "ArrowRight" || e.key === "d") keyDir.v = 1;
    }
    function onKeyUp(e: KeyboardEvent) {
      if (["ArrowLeft", "a", "ArrowRight", "d"].includes(e.key)) keyDir.v = 0;
    }
    function onPointer(e: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      targetX.v = THREE.MathUtils.clamp(nx * ROAD_HALF * 2.4, -ROAD_HALF, ROAD_HALF);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("pointermove", onPointer);
    renderer.domElement.addEventListener("pointerdown", onPointer);

    let raf = 0;
    let seenReset = resetSignal.current;

    function loop(t: number) {
      raf = requestAnimationFrame(loop);

      if (seenReset !== resetSignal.current) {
        seenReset = resetSignal.current;
        clearItems();
        targetX.v = 0;
        runner.position.x = 0;
        // 開始時に道を埋めておく（いきなり何も来ないと間延びする）
        for (let i = 0; i < 6; i++) spawn();
      }

      const playing = phaseRef.current === "playing";
      const speed = currentSpeed();

      if (playing) {
        targetX.v = THREE.MathUtils.clamp(
          targetX.v + keyDir.v * 0.3,
          -ROAD_HALF,
          ROAD_HALF
        );

        for (let i = items.length - 1; i >= 0; i--) {
          const it = items[i];
          it.prevZ = it.group.position.z;
          it.group.position.z += speed;

          if (it.prevZ < PLAYER_Z && it.group.position.z >= PLAYER_Z) {
            if (it.kind === "gate") {
              reachedRef.current += 1;
              setReached(reachedRef.current);
              if (reachedRef.current >= goal) {
                phaseRef.current = "won";
                setPhase("won");
              }
            } else {
              // すき間からはみ出していたら残機を1つ減らす。0になった時だけ終了
              const off = Math.abs(runner.position.x - it.gapCenter);
              if (off > it.gapWidth / 2 - RUNNER_HALF) {
                livesRef.current -= 1;
                setLives(livesRef.current);
                if (livesRef.current <= 0) {
                  phaseRef.current = "lost";
                  setPhase("lost");
                  /* 落ちた回数はここで数える（effect で phase を見て数える形にすると
                     「effect の中で setState するな」に触るし、意味も同じ） */
                  setFails((n) => n + 1);
                } else {
                  /* まだ残機がある。ぶつかった表示を一瞬だけ出して走り続ける */
                  setBumped(true);
                  if (bumpTimer.current) clearTimeout(bumpTimer.current);
                  bumpTimer.current = setTimeout(() => setBumped(false), 600);
                }
              }
            }
          }

          if (it.group.position.z > 12) {
            scene.remove(it.group);
            items.splice(i, 1);
          }
        }

        // 先頭が近づいたら継ぎ足す
        while (items.length < 7) spawn();
      }

      // 走者を目標位置へ寄せ、走っているように上下させる
      const dx = targetX.v - runner.position.x;
      runner.position.x += dx * 0.16;
      runner.rotation.z = THREE.MathUtils.clamp(-dx * 0.09, -0.3, 0.3);
      runner.position.y = playing ? Math.abs(Math.sin(t * 0.012)) * 0.22 : Math.sin(t * 0.002) * 0.1;

      road.position.z = -100 + ((t * 0.001 * speed * 60) % 8);
      camera.position.x += (runner.position.x * 0.32 - camera.position.x) * 0.07;

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      if (bumpTimer.current) clearTimeout(bumpTimer.current);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointermove", onPointer);
      renderer.domElement.removeEventListener("pointerdown", onPointer);
      wallGeo.dispose();
      gateGeo.dispose();
      edgeGeo.dispose();
      stage.dispose();
    };
  }, [steps]);

  const start = () => {
    reachedRef.current = 0;
    setReached(0);
    livesRef.current = START_LIVES;
    setLives(START_LIVES);
    setBumped(false);
    resetSignal.current += 1;
    phaseRef.current = "playing";
    setPhase("playing");
  };

  return (
    <GameShell
      title="経歴を駆け抜けろ"
      target="職歴"
      rule={
        <>
          壁のすき間を抜けて{total}つの関門を通過せよ。ぶつかっても{START_LIVES}回までは走り続けられる。
          <br />
          関門を越えるごとに少しだけ速くなり、すき間も少しだけ狭くなる。
        </>
      }
      difficulty={2}
      itemId="career"
      phase={phase}
      hud={
        <>
          <span>
            関門: {reached} / {total}
          </span>
          <span>
            残機: {"\u25cf".repeat(Math.max(lives, 0))}
            {"\u25cb".repeat(Math.max(START_LIVES - lives, 0))}
          </span>
        </>
      }
      overlay={
        bumped ? (
          <span className="rounded-full bg-(--color-clay) px-4 py-1.5 text-xs font-bold text-(--color-white)">
            ぶつかった！ 残機 −1
          </span>
        ) : reached > 0 ? (
          <span className="max-w-full truncate rounded-full bg-(--color-ink)/80 px-4 py-1.5 text-xs font-bold text-(--color-white)">
            {steps[reached - 1]}
          </span>
        ) : null
      }
      lostHint={
        fails >= 3 && !isTouchDevice() ? (
          <>
            モバイルでやったほうが簡単かも！？
            <br />
            <span className="font-normal text-(--color-bg-soft)">
              指で触った場所へそのまま動く
            </span>
          </>
        ) : null
      }
      mountRef={mountRef}
      onStart={start}
      onRetry={start}
      onClose={onClose}
      onReveal={onReveal}
      onUnlockAll={onUnlockAll}
    />
  );
}
