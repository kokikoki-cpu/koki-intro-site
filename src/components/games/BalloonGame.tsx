"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import GameShell from "./GameShell";
import {
  PAL,
  addNightLights,
  createStage,
  nightSkyTexture,
  outlineFor,
  toonMat,
  type GamePhase,
} from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * トルコ（カッパドキア）の解錠ゲーム。
 *
 * 調べた事実をそのまま設計に使っている:
 * - 気球は**日の出前に離陸する** → 進むほど空が夜からemberの朝焼けへ変わる。
 *   進捗を数字ではなく空の色で見せられる（`nightSkyTexture({dawn})`）
 * - **妖精の煙突**は「硬い玄武岩が帽子のように、柔らかい凝灰岩の胴を守っている」形
 *   → 胴（細いテーパー）＋帽子（一回り太い暗い岩）で作る。ただの円柱にしない
 * - 空には**同時に100機以上**の気球が浮かぶ → それを「天井」として障害物にした。
 *   下は煙突、上は他の気球。その隙間を抜ける
 *
 * 操作は「押している間だけバーナーが焚かれて上昇、放すと下降」の一本。
 * **画面のどこを押しても同じ**なので、指が自機に被る問題が原理的に起きない
 * （DESIGN.md「指と被る問題」の解決策③）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    gates: Math.round(mix(4, 8)),
    /** 通り抜けられる縦の隙間。当たり判定の実効窓は gap/2 - HIT_R */
    gap: mix(10, 9),
    /** 岩が近づいてくる速さ */
    speed: mix(9.5, 15),
    /** 門の間隔（秒） */
    intervalMs: mix(2000, 1450),
  };
}

/* 見上げる画角。気球は左寄りに固定して、右から岩が来る */
const BALLOON_X = -7;
/* 気球はもっさり動く。加速を強くすると気球ではなくジェットになり、
   人の反応（0.2秒くらい遅れる）では振動して抜けられなくなる
   （シミュレータで初心者モデルが1つ目の門で大きく外していた）。
   空気抵抗を入れて終端速度を作り、押しっぱなしでも暴れないようにしてある。 */
const LIFT = 12; // バーナーの加速度
const GRAVITY = -6.5;
const DRAG = 0.985; // 毎フレームの減衰
const VY_MAX = 6;
const Y_MIN = -7;
const Y_MAX = 13;
const HIT_R = 1.5;

export default function BalloonGame({
  countryName,
  itemId,
  level,
  onReveal,
  onClose,
  onUnlockAll,
}: {
  countryName: string;
  itemId: string;
  level: Level;
  onReveal: () => void;
  onClose: () => void;
  onUnlockAll: () => void;
}) {
  const cfg = tuning(level);
  const mountRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<GamePhase>("intro");
  const [passed, setPassed] = useState(0);

  const phaseRef = useRef<GamePhase>("intro");
  const passedRef = useRef(0);
  const burnRef = useRef(false);
  const resetRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    passedRef.current = 0;
    setPassed(0);
    phaseRef.current = "playing";
    setPhase("playing");
    resetRef.current?.();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const stage = createStage(mount);
    const { scene, camera, renderer } = stage;

    camera.position.set(0, 3.4, 26);
    camera.lookAt(0, 3.2, 0);

    let dawn = 0;
    const setSky = (d: number) => {
      scene.background = nightSkyTexture({ dawn: d, glow: 0.72, seed: 5521 });
    };
    setSky(0);
    scene.fog = new THREE.Fog(0x141c26, 40, 120);
    addNightLights(scene);

    /* --- 気球本体（球＋籠）。輪郭線を付けてサイトの絵と揃える --------------- */
    const balloon = new THREE.Group();
    const envelope = new THREE.Mesh(new THREE.SphereGeometry(1.5, 18, 14), toonMat(PAL.ember, 12));
    envelope.add(outlineFor(envelope, 1.06));
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), toonMat(PAL.nebula, 6));
    basket.position.y = -2.1;
    basket.add(outlineFor(basket, 1.1));
    /* バーナーの炎。焚いている間だけ出す */
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.3, 0.9, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd9a0 })
    );
    flame.position.y = -1.35;
    flame.visible = false;
    balloon.add(envelope, basket, flame);
    balloon.position.set(BALLOON_X, 3, 0);
    scene.add(balloon);

    /* --- 地面（夜の凝灰岩の台地） ------------------------------------------ */
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 200),
      toonMat(PAL.sandNightFar, 4)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = Y_MIN - 2.6;
    scene.add(ground);

    /* --- 遠景の気球の群れ（同時に100機以上、という事実の絵） --------------- */
    const far: THREE.Mesh[] = [];
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.5 + (i % 3) * 0.16, 10, 8),
        toonMat(i % 2 ? PAL.clay : PAL.nebula, 4)
      );
      m.position.set(-60 + i * 5.2, 6 + ((i * 7) % 11), -40 - ((i * 13) % 30));
      scene.add(m);
      far.push(m);
    }

    /* --- 門: 下の妖精の煙突 ＋ 上の気球 ------------------------------------ */
    type Gate = { group: THREE.Group; gapY: number; scored: boolean };
    const gates: Gate[] = [];

    /** 妖精の煙突。硬い帽子＋柔らかい胴。ただの円柱にしないこと */
    function chimney(height: number): THREE.Group {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CylinderGeometry(0.95, 2.0, height, 10),
        toonMat(PAL.sandNight, 5)
      );
      body.position.y = height / 2;
      body.add(outlineFor(body, 1.04));
      /* 帽子（玄武岩）。胴より太くて暗い。この一段があるだけで「あの奇岩」に見える */
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.35, 0.9, 10), toonMat(0x2b241c, 4));
      cap.position.y = height + 0.35;
      cap.add(outlineFor(cap, 1.06));
      g.add(body, cap);
      return g;
    }

    function spawnGate() {
      const group = new THREE.Group();
      /* 隙間の中心。低すぎ高すぎを避ける */
      const gapY = -1 + Math.random() * 7;
      const topOfChimney = gapY - cfg.gap / 2;
      const height = Math.max(2.5, topOfChimney - (Y_MIN - 2.6));
      const ch = chimney(height);
      ch.position.y = Y_MIN - 2.6;
      group.add(ch);

      /* 上の天井は他の気球。3つ並べて「群れ」に見せる */
      const ceil = gapY + cfg.gap / 2;
      for (let i = -1; i <= 1; i++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(1.25, 12, 10), toonMat(PAL.clay, 8));
        b.position.set(i * 2.2, ceil + 1.3 + Math.abs(i) * 0.5, i * 0.6);
        b.add(outlineFor(b, 1.06));
        group.add(b);
      }

      group.position.x = 34;
      scene.add(group);
      gates.push({ group, gapY, scored: false });
    }

    resetRef.current = () => {
      gates.forEach((g) => scene.remove(g.group));
      gates.length = 0;
      balloon.position.y = 3;
      vy = 0;
      dawn = 0;
      setSky(0);
      lastSpawn = 0;
    };

    let vy = 0;
    let lastSpawn = 0;
    let last = performance.now();
    let raf = 0;

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      /* 遠景はいつでもゆっくり流す（intro の画面でも絵が生きている） */
      far.forEach((m) => {
        m.position.x += dt * 1.1;
        if (m.position.x > 70) m.position.x = -70;
      });

      if (phaseRef.current === "playing") {
        /* 上下。押している間だけ上向きの加速 */
        vy += (burnRef.current ? LIFT : 0) * dt + GRAVITY * dt;
        vy *= DRAG;
        vy = THREE.MathUtils.clamp(vy, -VY_MAX, VY_MAX);
        balloon.position.y = THREE.MathUtils.clamp(balloon.position.y + vy * dt, Y_MIN, Y_MAX);
        if (balloon.position.y <= Y_MIN || balloon.position.y >= Y_MAX) vy = 0;
        flame.visible = burnRef.current;
        /* 焚くと少し膨らむ */
        const s = burnRef.current ? 1.04 : 1;
        envelope.scale.setScalar(s);
        balloon.rotation.z = THREE.MathUtils.clamp(-vy * 0.04, -0.16, 0.16);

        if (now - lastSpawn > cfg.intervalMs) {
          spawnGate();
          lastSpawn = now;
        }

        for (const g of gates) {
          g.group.position.x -= cfg.speed * dt;

          /* 通過判定。門の中心を越えたら1つ加算 */
          if (!g.scored && g.group.position.x < BALLOON_X) {
            g.scored = true;
            passedRef.current += 1;
            setPassed(passedRef.current);
            /* 抜けるほど夜が明ける */
            dawn = Math.min(1, passedRef.current / cfg.gates);
            setSky(dawn);
            if (passedRef.current >= cfg.gates) {
              phaseRef.current = "won";
              setPhase("won");
            }
          }

          /* 当たり判定。門の板の範囲に入っている時だけ縦を見る */
          const dx = Math.abs(g.group.position.x - BALLOON_X);
          if (dx < 2.6) {
            const dy = balloon.position.y - g.gapY;
            if (Math.abs(dy) > cfg.gap / 2 - HIT_R) {
              phaseRef.current = "lost";
              setPhase("lost");
            }
          }
        }

        /* 画面外に出た門を捨てる */
        for (let i = gates.length - 1; i >= 0; i--) {
          if (gates[i].group.position.x < -40) {
            scene.remove(gates[i].group);
            gates.splice(i, 1);
          }
        }
      } else {
        flame.visible = false;
        /* 待機中はゆっくり浮いている */
        balloon.position.y = 3 + Math.sin(now / 900) * 0.5;
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    /* 入力: 画面のどこでも押している間だけ上昇。指の位置は一切見ない */
    const down = () => {
      burnRef.current = true;
    };
    const up = () => {
      burnRef.current = false;
    };
    const el = renderer.domElement;
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    const key = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        burnRef.current = e.type === "keydown";
      }
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      stage.dispose();
    };
  }, [cfg.gap, cfg.gates, cfg.intervalMs, cfg.speed]);

  return (
    <GameShell
      title="夜明け前の離陸"
      target={countryName}
      rule={
        <>
          押している間だけバーナーが焚かれて上がる。放すと下がる。
          <br />
          下は妖精の煙突、上は他の気球。{cfg.gates}個の隙間を抜けろ。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            通過 {passed} / {cfg.gates}
          </span>
          <span>夜明けまで {Math.max(0, cfg.gates - passed)}</span>
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
