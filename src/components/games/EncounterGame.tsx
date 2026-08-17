"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import GameShell from "./GameShell";
import {
  PAL,
  addLights,
  createStage,
  loadTexture,
  optimizedSrc,
  outlineFor,
  skyTexture,
  toonMat,
  type GamePhase,
} from "./three-kit";

const HIT_TARGET = 6;
const TIME_LIMIT = 14_000;

const X_LIMIT = 5.4;
const Y_LIMIT = 3.1;
const Z_MIN = -2.5;
const Z_MAX = 2.0;

export default function EncounterGame({
  personName,
  personPhoto,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  personName: string;
  personPhoto: string;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [hits, setHits] = useState(0);
  const [remain, setRemain] = useState(TIME_LIMIT);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>("intro");
  const hitsRef = useRef(0);
  const resetSignal = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const stage = createStage(mount, { fov: 55, far: 160 });
    const { scene, camera, renderer } = stage;

    scene.background = skyTexture({
      top: "#5c4030",
      mid: "#a8714a",
      bottom: "#e2d3bb",
      sun: { y: 0.78, color: "rgba(255,240,210,0.85)" },
    });
    scene.fog = new THREE.Fog(0xb08a63, 26, 60);
    addLights(scene, 0xffe8cf, 0x5a3a24);

    camera.position.set(0, 0, 12.5);
    camera.lookAt(0, 0, 0);

    // --- 背景の雑踏（奥をゆっくり行き交うシルエット） ---
    const crowdGeo = new THREE.CapsuleGeometry(0.42, 1.15, 3, 7);
    const crowd: { mesh: THREE.Mesh; speed: number }[] = [];
    for (let i = 0; i < 16; i++) {
      const shade = i % 3 === 0 ? 0x4a3728 : 0x3a2b1f;
      const m = new THREE.Mesh(crowdGeo, toonMat(shade, 3));
      const depth = -8 - Math.random() * 12;
      m.position.set((Math.random() - 0.5) * 34, -3.4 + Math.random() * 1.2, depth);
      m.scale.setScalar(1.2 + Math.random() * 0.6);
      crowd.push({ mesh: m, speed: (Math.random() < 0.5 ? -1 : 1) * (0.012 + Math.random() * 0.022) });
      scene.add(m);
    }

    // --- 標的（本人の写真を貼った球体） ---
    // 的は小さめ。大きくすると「置いてある的を押す」だけの作業になる
    const sphereGeo = new THREE.SphereGeometry(0.95, 26, 20);
    const sphereMat = new THREE.MeshPhongMaterial({ color: 0xf3ead9, shininess: 10 });
    const targetMesh = new THREE.Mesh(sphereGeo, sphereMat);
    targetMesh.add(outlineFor(targetMesh, 1.05));
    scene.add(targetMesh);

    let disposed = false;
    loadTexture(optimizedSrc(personPhoto, 640)).then((tex) => {
      if (disposed || !tex) return;
      sphereMat.map = tex;
      sphereMat.color.setHex(0xffffff);
      sphereMat.needsUpdate = true;
    });

    // --- 命中エフェクト ---
    const burstGeo = new THREE.RingGeometry(1.2, 1.55, 26);
    const burstMat = new THREE.MeshBasicMaterial({
      color: PAL.clay,
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const burst = new THREE.Mesh(burstGeo, burstMat);
    burst.visible = false;
    scene.add(burst);

    const vel = { x: 0.105, y: 0.075, z: 0.024 };
    let burstAge = -1;
    let popAge = -1;
    let startedAt = 0;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    function reposition() {
      targetMesh.position.set(
        (Math.random() - 0.5) * X_LIMIT * 1.6,
        (Math.random() - 0.5) * Y_LIMIT * 1.4,
        Z_MIN + Math.random() * (Z_MAX - Z_MIN)
      );
    }

    function onPointerDown(e: PointerEvent) {
      if (phaseRef.current !== "playing") return;
      const rect = renderer.domElement.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      // 子のアウトラインは判定に含めない（球体そのものだけを見る）
      if (raycaster.intersectObject(targetMesh, false).length === 0) return;

      hitsRef.current += 1;
      setHits(hitsRef.current);

      burst.position.copy(targetMesh.position);
      burstAge = 0;
      popAge = 0;

      // 当てるたびに逃げ足が速くなる
      const boost = 1 + hitsRef.current * 0.22;
      const dir = () => (Math.random() < 0.5 ? -1 : 1);
      vel.x = dir() * (0.105 + Math.random() * 0.04) * boost;
      vel.y = dir() * (0.075 + Math.random() * 0.04) * boost;
      vel.z = dir() * 0.028 * boost;
      reposition();
    }
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    let raf = 0;
    let seenReset = resetSignal.current;

    function loop(t: number) {
      raf = requestAnimationFrame(loop);

      if (seenReset !== resetSignal.current) {
        seenReset = resetSignal.current;
        vel.x = 0.075;
        vel.y = 0.052;
        vel.z = 0.02;
        targetMesh.position.set(0, 0, 0);
        targetMesh.scale.setScalar(1);
        burst.visible = false;
        burstAge = -1;
        popAge = -1;
        startedAt = t;
      }

      const playing = phaseRef.current === "playing";

      for (const c of crowd) {
        c.mesh.position.x += c.speed;
        if (c.mesh.position.x > 18) c.mesh.position.x = -18;
        if (c.mesh.position.x < -18) c.mesh.position.x = 18;
      }

      if (playing) {
        targetMesh.position.x += vel.x;
        targetMesh.position.y += vel.y;
        targetMesh.position.z += vel.z;
        if (Math.abs(targetMesh.position.x) > X_LIMIT) vel.x *= -1;
        if (Math.abs(targetMesh.position.y) > Y_LIMIT) vel.y *= -1;
        if (targetMesh.position.z < Z_MIN || targetMesh.position.z > Z_MAX) vel.z *= -1;

        const left = TIME_LIMIT - (t - startedAt);
        setRemain(Math.max(0, left));

        if (hitsRef.current >= HIT_TARGET) {
          phaseRef.current = "won";
          setPhase("won");
        } else if (left <= 0) {
          phaseRef.current = "lost";
          setPhase("lost");
        }
      } else {
        targetMesh.position.y = Math.sin(t * 0.002) * 0.4;
      }

      targetMesh.rotation.y += 0.014;

      // 命中時の弾けるリング
      if (burstAge >= 0) {
        burstAge += 16;
        burst.visible = true;
        burst.position.z = targetMesh.position.z;
        burst.lookAt(camera.position);
        burst.scale.setScalar(1 + burstAge / 260);
        burstMat.opacity = Math.max(0, 1 - burstAge / 420);
        if (burstAge > 420) {
          burstAge = -1;
          burst.visible = false;
        }
      }

      // 命中時に一瞬ふくらむ
      if (popAge >= 0) {
        popAge += 16;
        const k = Math.max(0, 1 - popAge / 260);
        targetMesh.scale.setScalar(1 + k * 0.35);
        if (popAge > 260) {
          popAge = -1;
          targetMesh.scale.setScalar(1);
        }
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      crowdGeo.dispose();
      burstGeo.dispose();
      stage.dispose();
    };
  }, [personPhoto]);

  const start = () => {
    hitsRef.current = 0;
    setHits(0);
    setRemain(TIME_LIMIT);
    resetSignal.current += 1;
    phaseRef.current = "playing";
    setPhase("playing");
  };

  return (
    <GameShell
      title="話しかけろ"
      target={personName}
      rule={
        <>
          逃げ回る{personName}を{HIT_TARGET}回タップ（クリック）すれば話を聞ける。制限時間は
          {Math.round(TIME_LIMIT / 1000)}秒。
          <br />
          当てるたびに逃げ足が速くなる。
        </>
      }
      phase={phase}
      hud={
        <>
          <span>
            捕捉: {hits} / {HIT_TARGET}
          </span>
          <span>残り {(remain / 1000).toFixed(1)}秒</span>
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
