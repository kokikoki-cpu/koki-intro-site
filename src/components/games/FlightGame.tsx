"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import GameShell from "./GameShell";
import {
  PAL,
  addLights,
  createStage,
  lowPolyGround,
  outlineFor,
  skyTexture,
  toonMat,
  type GamePhase,
} from "./three-kit";

const PASS_TARGET = 6;
const MAX_MISS = 2;
/** 輪を小さくするのが一番効く難易度調整。緩めると通過が作業になる */
const RING_RADIUS = 1.6;
const SPAWN_INTERVAL = 780;
const PLAYER_Z = 0;
const SPAWN_Z = -62;

const X_LIMIT = 6.2;
const Y_MIN = -2.2;
const Y_MAX = 4.2;

type Ring = { mesh: THREE.Group; prevZ: number; speed: number };

export default function FlightGame({
  countryName,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  countryName: string;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [passed, setPassed] = useState(0);
  const [miss, setMiss] = useState(0);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>("intro");
  const passedRef = useRef(0);
  const missRef = useRef(0);
  const target = useRef({ x: 0, y: 0.8 });
  const keyDir = useRef({ x: 0, y: 0 });
  const resetSignal = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const stage = createStage(mount, { fov: 62, far: 220 });
    const { scene, camera, renderer } = stage;

    scene.background = skyTexture({
      top: "#3b5668",
      mid: "#88a1a8",
      bottom: "#e0d9c6",
      sun: { y: 0.82 },
    });
    scene.fog = new THREE.Fog(0xc9c6b4, 34, 78);
    addLights(scene, 0xe8f0f4, 0x6b5540);

    camera.position.set(0, 1.9, 7.4);
    camera.lookAt(0, 1.0, -22);

    // --- 地面（はるか下を流れる大地） ---
    const ground = lowPolyGround({ color: 0xc9a877, size: 200, amp: 2.6, y: -12, z: -60 });
    scene.add(ground);

    // --- 自機（低ポリの飛行機） ---
    const plane = new THREE.Group();
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.1, 7), toonMat(PAL.white, 16));
    body.rotation.x = -Math.PI / 2;
    body.add(outlineFor(body, 1.1));
    plane.add(body);

    const wing = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.12, 0.62), toonMat(PAL.accent, 12));
    wing.position.z = 0.15;
    wing.add(outlineFor(wing, 1.08));
    plane.add(wing);

    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.1, 0.36), toonMat(PAL.clay, 12));
    tail.position.set(0, 0.28, 0.95);
    tail.add(outlineFor(tail, 1.12));
    plane.add(tail);

    plane.position.set(0, 0.8, PLAYER_Z);
    scene.add(plane);

    // --- 雲（低ポリの板を流す） ---
    const clouds: THREE.Mesh[] = [];
    const cloudGeo = new THREE.BoxGeometry(1, 1, 1);
    for (let i = 0; i < 22; i++) {
      const m = new THREE.Mesh(cloudGeo, toonMat(0xfdfaf2, 2));
      m.scale.set(3 + Math.random() * 4, 0.5 + Math.random() * 0.5, 2 + Math.random() * 3);
      m.position.set(
        (Math.random() - 0.5) * 44,
        -4 + Math.random() * 12,
        -Math.random() * 120
      );
      clouds.push(m);
      scene.add(m);
    }

    // --- リング（くぐる目標） ---
    const ringGeo = new THREE.TorusGeometry(RING_RADIUS, 0.16, 8, 28);
    const rings: Ring[] = [];

    function spawnRing() {
      const g = new THREE.Group();
      const torus = new THREE.Mesh(ringGeo, toonMat(PAL.clay, 14));
      torus.add(outlineFor(torus, 1.06));
      g.add(torus);
      g.position.set(
        (Math.random() - 0.5) * X_LIMIT * 1.7,
        Y_MIN + 0.6 + Math.random() * (Y_MAX - Y_MIN - 1.2),
        SPAWN_Z
      );
      scene.add(g);
      rings.push({ mesh: g, prevZ: SPAWN_Z, speed: 0.95 + passedRef.current * 0.09 });
    }

    function clearRings() {
      for (const r of rings) scene.remove(r.mesh);
      rings.length = 0;
    }

    // --- 入力 ---
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "a") keyDir.current.x = -1;
      if (e.key === "ArrowRight" || e.key === "d") keyDir.current.x = 1;
      if (e.key === "ArrowUp" || e.key === "w") keyDir.current.y = 1;
      if (e.key === "ArrowDown" || e.key === "s") keyDir.current.y = -1;
    }
    function onKeyUp(e: KeyboardEvent) {
      if (["ArrowLeft", "a", "ArrowRight", "d"].includes(e.key)) keyDir.current.x = 0;
      if (["ArrowUp", "w", "ArrowDown", "s"].includes(e.key)) keyDir.current.y = 0;
    }
    function pointerTo(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;
      target.current.x = THREE.MathUtils.clamp(nx * X_LIMIT * 2.2, -X_LIMIT, X_LIMIT);
      target.current.y = THREE.MathUtils.clamp(-ny * 8 + 0.9, Y_MIN, Y_MAX);
    }
    function onPointer(e: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      pointerTo(e);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("pointermove", onPointer);
    renderer.domElement.addEventListener("pointerdown", onPointer);

    let raf = 0;
    let lastSpawn = 0;
    let seenReset = resetSignal.current;

    function loop(t: number) {
      raf = requestAnimationFrame(loop);

      // 親から「リセットして」と言われたら初期化する
      if (seenReset !== resetSignal.current) {
        seenReset = resetSignal.current;
        clearRings();
        target.current = { x: 0, y: 0.8 };
        plane.position.set(0, 0.8, PLAYER_Z);
        lastSpawn = t;
      }

      const playing = phaseRef.current === "playing";

      // 雲は常に流す（待機中も画面が動いている方が気持ちいい）
      for (const c of clouds) {
        c.position.z += playing ? 0.9 : 0.32;
        if (c.position.z > 14) {
          c.position.z = -120;
          c.position.x = (Math.random() - 0.5) * 44;
        }
      }

      if (playing) {
        // キー入力でも狙いを動かす
        target.current.x = THREE.MathUtils.clamp(
          target.current.x + keyDir.current.x * 0.22,
          -X_LIMIT,
          X_LIMIT
        );
        target.current.y = THREE.MathUtils.clamp(
          target.current.y + keyDir.current.y * 0.16,
          Y_MIN,
          Y_MAX
        );

        if (t - lastSpawn > SPAWN_INTERVAL) {
          spawnRing();
          lastSpawn = t;
        }

        for (let i = rings.length - 1; i >= 0; i--) {
          const r = rings[i];
          r.prevZ = r.mesh.position.z;
          r.mesh.position.z += r.speed;
          r.mesh.rotation.z += 0.012;

          // 自機の位置を通過した瞬間に judge する
          if (r.prevZ < PLAYER_Z && r.mesh.position.z >= PLAYER_Z) {
            const dx = r.mesh.position.x - plane.position.x;
            const dy = r.mesh.position.y - plane.position.y;
            const through = Math.hypot(dx, dy) < RING_RADIUS * 0.92;
            if (through) {
              passedRef.current += 1;
              setPassed(passedRef.current);
            } else {
              missRef.current += 1;
              setMiss(missRef.current);
            }
          }

          if (r.mesh.position.z > 10) {
            scene.remove(r.mesh);
            rings.splice(i, 1);
          }
        }

        if (passedRef.current >= PASS_TARGET) {
          phaseRef.current = "won";
          setPhase("won");
        } else if (missRef.current >= MAX_MISS) {
          phaseRef.current = "lost";
          setPhase("lost");
        }
      }

      // 自機を目標位置へ滑らかに寄せ、進行方向に機体を傾ける
      const dx = target.current.x - plane.position.x;
      const dy = target.current.y - plane.position.y;
      plane.position.x += dx * 0.12;
      plane.position.y += dy * 0.12;
      plane.rotation.z = THREE.MathUtils.clamp(-dx * 0.22, -0.7, 0.7);
      plane.rotation.x = THREE.MathUtils.clamp(dy * 0.12, -0.3, 0.3);
      if (!playing) plane.position.y = 0.8 + Math.sin(t * 0.0022) * 0.28;

      camera.position.x += (plane.position.x * 0.28 - camera.position.x) * 0.06;

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointermove", onPointer);
      renderer.domElement.removeEventListener("pointerdown", onPointer);
      ringGeo.dispose();
      cloudGeo.dispose();
      stage.dispose();
    };
  }, []);

  const start = () => {
    passedRef.current = 0;
    missRef.current = 0;
    setPassed(0);
    setMiss(0);
    resetSignal.current += 1;
    phaseRef.current = "playing";
    setPhase("playing");
  };

  return (
    <GameShell
      title="その国へ飛べ"
      target={countryName}
      rule={
        <>
          輪を{PASS_TARGET}回くぐれば{countryName}に着陸。{MAX_MISS}回外したら引き返し。
          <br />
          マウス（スマホは指）で機体を動かす。
        </>
      }
      difficulty={4}
      phase={phase}
      hud={
        <>
          <span>
            通過: {passed} / {PASS_TARGET}
          </span>
          <span>
            残り: {"●".repeat(Math.max(MAX_MISS - miss, 0))}
            {"○".repeat(Math.min(miss, MAX_MISS))}
          </span>
        </>
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
