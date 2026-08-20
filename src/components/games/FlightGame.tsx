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

/** 難易度ごとの調整。輪が小さく・速くなり、通過数が増えて許容ミスが減る */
function tuning(level: number) {
  return {
    passTarget: 3 + level,
    maxMiss: level <= 2 ? 3 : 2,
    ringRadius: 2.45 - level * 0.19,
    baseSpeed: 0.68 + level * 0.07,
    spawnInterval: 980 - level * 45,
  };
}
const PLAYER_Z = 0;
const SPAWN_Z = -62;

const X_LIMIT = 6.2;
const Y_MIN = -2.2;
const Y_MAX = 4.2;

type Ring = { mesh: THREE.Group; prevZ: number; speed: number };

export default function FlightGame({
  countryName,
  level,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  countryName: string;
  level: 1 | 2 | 3 | 4 | 5;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const {
    passTarget: PASS_TARGET,
    maxMiss: MAX_MISS,
    ringRadius: RING_RADIUS,
    baseSpeed: BASE_SPEED,
    spawnInterval: SPAWN_INTERVAL,
  } = tuning(level);

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

    // --- 自機（デルタ翼の戦闘機） ---
    const plane = new THREE.Group();
    const skin = toonMat(0xe9e5d8, 22);

    // 胴体（細長く、機首を尖らせる）
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.16, 3.1, 8), skin);
    fuse.rotation.x = Math.PI / 2;
    fuse.add(outlineFor(fuse, 1.07));
    plane.add(fuse);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.2, 8), skin);
    nose.rotation.x = -Math.PI / 2;
    nose.position.z = -2.1;
    nose.add(outlineFor(nose, 1.09));
    plane.add(nose);

    // 主翼: 後退角のついた三角形
    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, -0.9);
    wingShape.lineTo(2.5, 0.9);
    wingShape.lineTo(0.5, 1.05);
    wingShape.lineTo(0, 0.2);
    const wingGeo = new THREE.ExtrudeGeometry(wingShape, { depth: 0.1, bevelEnabled: false });
    for (const side of [1, -1]) {
      const wing = new THREE.Mesh(wingGeo, toonMat(PAL.accent, 14));
      wing.scale.x = side;
      wing.rotation.x = -Math.PI / 2;
      wing.position.set(0, -0.04, 0.35);
      wing.add(outlineFor(wing, 1.04));
      plane.add(wing);
    }

    // 双尾翼
    for (const side of [1, -1]) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.62, 0.5), toonMat(PAL.clay, 12));
      fin.position.set(side * 0.38, 0.34, 1.2);
      fin.rotation.z = side * 0.24;
      fin.add(outlineFor(fin, 1.14));
      plane.add(fin);
    }

    // 排気の炎
    const burner = new THREE.Mesh(
      new THREE.ConeGeometry(0.22, 1.1, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc266, transparent: true, opacity: 0.9 })
    );
    burner.rotation.x = Math.PI / 2;
    burner.position.z = 2.1;
    plane.add(burner);

    plane.position.set(0, 0.8, PLAYER_Z);
    scene.add(plane);

    // --- 雲（球をいくつも寄せた塊。板だと嘘っぽい） ---
    const clouds: THREE.Group[] = [];
    const puffGeo = new THREE.SphereGeometry(1, 9, 7);
    const puffMat = toonMat(0xfdfbf4, 2);
    for (let i = 0; i < 16; i++) {
      const g = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 4);
      for (let j = 0; j < puffs; j++) {
        const m = new THREE.Mesh(puffGeo, puffMat);
        const r = 1.1 + Math.random() * 1.5;
        m.scale.set(r, r * 0.72, r);
        m.position.set((j - puffs / 2) * 1.5 + Math.random(), Math.random() * 0.8, Math.random() * 1.2);
        g.add(m);
      }
      g.position.set((Math.random() - 0.5) * 46, -5 + Math.random() * 14, -Math.random() * 130);
      clouds.push(g);
      scene.add(g);
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
      rings.push({ mesh: g, prevZ: SPAWN_Z, speed: BASE_SPEED + passedRef.current * 0.08 });
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
      /* 指で操作するときは、指の少し上を飛ばす。
         そのままだと機体が指の下に入って見えなくなる */
      const touchLift = e.pointerType === "touch" ? 2.1 : 0;
      target.current.x = THREE.MathUtils.clamp(nx * X_LIMIT * 2.2, -X_LIMIT, X_LIMIT);
      target.current.y = THREE.MathUtils.clamp(-ny * 8 + 0.9 + touchLift, Y_MIN, Y_MAX);
    }
    function onPointer(e: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      pointerTo(e);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    renderer.domElement.addEventListener("pointermove", onPointer);
    renderer.domElement.addEventListener("pointerdown", onPointer);

    // 抜けた瞬間に弾けるリング
    const burstGeo = new THREE.RingGeometry(RING_RADIUS * 0.8, RING_RADIUS * 1.05, 30);
    const burstMat = new THREE.MeshBasicMaterial({
      color: 0xffe9b8,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const burst = new THREE.Mesh(burstGeo, burstMat);
    burst.visible = false;
    scene.add(burst);
    let burstAge = -1;

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
              burst.position.copy(r.mesh.position);
              burst.visible = true;
              burstAge = 0;
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

      // 通過の余韻
      if (burstAge >= 0) {
        burstAge += 16;
        const k = burstAge / 480;
        burst.scale.setScalar(1 + k * 2.2);
        burst.position.z += 0.55;
        burstMat.opacity = Math.max(0, 1 - k);
        if (k >= 1) {
          burstAge = -1;
          burst.visible = false;
        }
      }

      // 排気は常にゆらぐ
      burner.scale.setScalar(playing ? 0.85 + Math.sin(t * 0.03) * 0.25 : 0.5);

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
      puffGeo.dispose();
      burstGeo.dispose();
      stage.dispose();
    };
  }, [level]);

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
      difficulty={level}
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
