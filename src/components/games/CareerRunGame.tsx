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
const WALLS_PER_GATE = 3;

const BASE_SPEED = 0.58;
const SPEED_PER_GATE = 0.062;
const BASE_GAP = 3.5;
const GAP_PER_GATE = 0.27;
/** これ以上は詰めない（詰めすぎると運ゲーになる） */
const MIN_GAP = 2.0;

const SPAWN_GAP_Z = 15.5;

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

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>("intro");
  const reachedRef = useRef(0);
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
              // すき間から少しでもはみ出していたら即終了
              const off = Math.abs(runner.position.x - it.gapCenter);
              if (off > it.gapWidth / 2 - RUNNER_HALF) {
                phaseRef.current = "lost";
                setPhase("lost");
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
          壁のすき間を抜けて{total}つの関門を通過せよ。かすっただけで即終了、残機なし。
          <br />
          関門を越えるごとに速くなり、すき間は狭くなる。
        </>
      }
      difficulty={5}
      itemId="career"
      phase={phase}
      hud={
        <>
          <span>
            関門: {reached} / {total}
          </span>
          <span className="text-(--color-clay)">残機なし</span>
        </>
      }
      overlay={
        reached > 0 ? (
          <span className="max-w-full truncate rounded-full bg-(--color-ink)/80 px-4 py-1.5 text-xs font-bold text-(--color-white)">
            {steps[reached - 1]}
          </span>
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
