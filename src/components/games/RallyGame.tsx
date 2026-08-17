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

const RALLY_TARGET = 6;
const MAX_MISS = 3;

const START_Z = -46;
const PLAYER_Z = 5.2;
/** この幅にボールがいる間に振れば当たり */
const HIT_WINDOW = 2.1;
/** ラケットの待機位置（振ると左へ振り抜く） */
const RACKET_X = 1.75;
const RACKET_Y = 1.05;
/** ここを越えたら見逃し */
const PASS_Z = PLAYER_Z + HIT_WINDOW;

export default function RallyGame({
  sportName,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  sportName: string;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [rally, setRally] = useState(0);
  const [miss, setMiss] = useState(0);

  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef<GamePhase>("intro");
  const rallyRef = useRef(0);
  const missRef = useRef(0);
  const swingSignal = useRef(0);
  const resetSignal = useRef(0);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const stage = createStage(mount, { fov: 58, far: 200 });
    const { scene, camera, renderer } = stage;

    scene.background = skyTexture({
      top: "#4e7050",
      mid: "#9cb98b",
      bottom: "#eae5d0",
      sun: { y: 0.8, color: "rgba(255,252,232,0.9)" },
    });
    scene.fog = new THREE.Fog(0xcfd6bb, 46, 100);
    addLights(scene, 0xf6fbec, 0x5d6b4a);

    camera.position.set(0, 3.0, 9.4);
    camera.lookAt(0, 1.1, -12);

    // --- コート ---
    const court = lowPolyGround({ color: 0x7fa06a, size: 150, amp: 0.12, y: -0.6, z: -40 });
    scene.add(court);

    const lineMat = toonMat(0xf2efe2, 2);
    const sideLine = new THREE.BoxGeometry(0.16, 0.04, 92);
    for (const x of [-7, 7]) {
      const l = new THREE.Mesh(sideLine, lineMat);
      l.position.set(x, -0.52, -38);
      scene.add(l);
    }

    // --- ネット ---
    const net = new THREE.Mesh(new THREE.BoxGeometry(15, 1.5, 0.12), toonMat(0xe8e3d2, 4));
    net.position.set(0, 0.2, -18);
    net.add(outlineFor(net, 1.02));
    scene.add(net);

    // --- 観客席がわりの低ポリの塊 ---
    const standGeo = new THREE.BoxGeometry(2.4, 1.6, 2.4);
    for (let i = 0; i < 14; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const m = new THREE.Mesh(standGeo, toonMat(i % 3 === 0 ? PAL.clay : 0x6d8560, 3));
      m.position.set(side * (11 + Math.random() * 3), 0.2, -6 - i * 5.5);
      scene.add(m);
    }

    // --- ラケット ---
    const racket = new THREE.Group();
    const head = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.11, 8, 22), toonMat(PAL.accent, 14));
    head.add(outlineFor(head, 1.06));
    racket.add(head);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.0, 0.16), toonMat(PAL.clay, 10));
    grip.position.y = -1.4;
    racket.add(grip);
    racket.scale.setScalar(0.78);
    racket.position.set(RACKET_X, RACKET_Y, PLAYER_Z - 0.6);
    racket.rotation.z = -0.45;
    scene.add(racket);

    // --- ボール ---
    const ballGeo = new THREE.SphereGeometry(0.34, 18, 14);
    const ball = new THREE.Mesh(ballGeo, toonMat(0xf5f0dc, 22));
    ball.add(outlineFor(ball, 1.1));
    scene.add(ball);

    let ballZ = START_Z;
    let ballSpeed = 0.62;
    let swung = false;
    let swingAge = -1;
    let hitFlash = -1;

    function resetBall(faster: boolean) {
      ballZ = START_Z;
      swung = false;
      if (faster) ballSpeed = Math.min(ballSpeed + 0.075, 1.5);
    }

    function ballY(): number {
      // 山なりの軌道: 飛び始めと手元で低く、途中が高い
      const p = (ballZ - START_Z) / (PASS_Z - START_Z);
      return 0.5 + Math.sin(Math.min(Math.max(p, 0), 1) * Math.PI) * 2.2;
    }

    function registerMiss() {
      missRef.current += 1;
      setMiss(missRef.current);
      resetBall(false);
    }

    function swing() {
      if (phaseRef.current !== "playing" || swung) return;
      swung = true;
      swingAge = 0;
      const inWindow = ballZ > PLAYER_Z - HIT_WINDOW && ballZ < PASS_Z;
      if (inWindow) {
        rallyRef.current += 1;
        setRally(rallyRef.current);
        hitFlash = 0;
        resetBall(true);
      } else {
        registerMiss();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === "Space" || e.key === "Enter") {
        e.preventDefault();
        swing();
      }
    }
    function onPointerDown() {
      swing();
    }
    window.addEventListener("keydown", onKeyDown);
    renderer.domElement.addEventListener("pointerdown", onPointerDown);

    let raf = 0;
    let seenReset = resetSignal.current;
    let seenSwing = swingSignal.current;

    function loop(t: number) {
      raf = requestAnimationFrame(loop);

      if (seenReset !== resetSignal.current) {
        seenReset = resetSignal.current;
        ballSpeed = 0.62;
        swingAge = -1;
        hitFlash = -1;
        resetBall(false);
      }
      // HUD のボタンなど React 側から振らせたい時のため
      if (seenSwing !== swingSignal.current) {
        seenSwing = swingSignal.current;
        swing();
      }

      const playing = phaseRef.current === "playing";

      if (playing) {
        ballZ += ballSpeed;
        if (ballZ > PASS_Z) {
          // 振らずに見逃した
          if (!swung) registerMiss();
          else resetBall(false);
        }

        if (rallyRef.current >= RALLY_TARGET) {
          phaseRef.current = "won";
          setPhase("won");
        } else if (missRef.current >= MAX_MISS) {
          phaseRef.current = "lost";
          setPhase("lost");
        }
      } else {
        ballZ = START_Z + ((t * 0.004) % (PASS_Z - START_Z));
      }

      ball.position.set(Math.sin(ballZ * 0.05) * 1.2, ballY(), ballZ);
      ball.rotation.x += 0.08;

      // 振りのモーション
      if (swingAge >= 0) {
        swingAge += 16;
        const k = Math.max(0, 1 - swingAge / 260);
        racket.rotation.z = -0.45 - k * 1.9;
        racket.position.x = RACKET_X - k * 2.2;
        if (swingAge > 260) {
          swingAge = -1;
          racket.rotation.z = -0.45;
          racket.position.x = RACKET_X;
        }
      } else {
        racket.position.y = RACKET_Y + Math.sin(t * 0.003) * 0.08;
      }

      // 当たった瞬間だけボールを光らせる
      if (hitFlash >= 0) {
        hitFlash += 16;
        const mat = ball.material as THREE.MeshPhongMaterial;
        mat.emissive.setHex(0x6b8f5f);
        mat.emissiveIntensity = Math.max(0, 1 - hitFlash / 300);
        if (hitFlash > 300) {
          hitFlash = -1;
          mat.emissive.setHex(0x000000);
        }
      }

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      ballGeo.dispose();
      standGeo.dispose();
      sideLine.dispose();
      stage.dispose();
    };
  }, []);

  const start = () => {
    rallyRef.current = 0;
    missRef.current = 0;
    setRally(0);
    setMiss(0);
    resetSignal.current += 1;
    phaseRef.current = "playing";
    setPhase("playing");
  };

  return (
    <GameShell
      title="ラリーを続けろ"
      target={sportName}
      rule={
        <>
          手元に来た瞬間にクリック（スペースキー / タップ）で打ち返す。{RALLY_TARGET}回続けば勝ち。
          <br />
          返すたびに球が速くなる。{MAX_MISS}回空振りでゲームオーバー。
        </>
      }
      phase={phase}
      hud={
        <>
          <span>
            ラリー: {rally} / {RALLY_TARGET}
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
