"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import GameShell from "./GameShell";
import { addNightLights, createStage, nightSkyTexture, outlineFor, toonMat, type GamePhase } from "./three-kit";
import type { Level } from "@/lib/data";

/**
 * 南極の解錠ゲーム。パックアイスを渡って進む。
 *
 * 調べた事実をそのまま設計に使っている:
 * - 定着氷が割れた浮き氷が海流で積み重なったものが**パックアイス**。
 *   風や波で分散すると**ポリニヤ（開水面）**ができる → 足場と、落ちたら終わりの隙間
 * - 棚氷が割れて出るのが**テーブル型氷山**（上面が平ら）→ 遠景のシルエットは平頂で描く。
 *   とんがった山にすると南極ではなくなる
 *
 * 操作は「長押しで踏み込みを溜めて、放すと跳ぶ」。
 * 他の4つ（左右移動・連打・記憶・コマンド）と操作の質が被らないようにこれにした。
 * ゲージの読みが下手だと**足りなくても跳びすぎても落ちる**ので、
 * 「強く押せばいい」にならない。
 *
 * 画面のどこを押しても溜まるので、指が自機に被らない（解決策③）。
 */

function tuning(level: Level) {
  const t = (level - 1) / 4;
  const mix = (easy: number, hard: number) => easy + (hard - easy) * t;
  return {
    hops: Math.round(mix(5, 7)),
    /** 次の氷までの距離の範囲 */
    dMin: mix(5, 6.5),
    dMax: mix(9, 13),
    /** 氷の幅（＝着地できる窓）。tools/sim-iceflow.mjs で実測して決めた値 */
    width: mix(3.6, 2.9),
    /** ゲージが端まで溜まる時間。短いほど指を離すタイミングの誤差が距離に化ける */
    chargeMs: mix(1100, 700),
  };
}

/* 南極の色。夜の海はほぼ黒、氷は生成りの白、遠景の氷山は青みを一段だけ */
const SEA = 0x0e1a28;
const ICE = 0xdfe7ec;
const BERG = 0x33495e;

/** 跳べる距離の下限と上限。ゲージ0で下限、ゲージ1で上限 */
const JUMP_MIN = 3.5;
const JUMP_MAX = 15;
const JUMP_MS = 620;

type Floe = { mesh: THREE.Mesh; left: number; right: number };

export default function IceflowGame({
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
  const [hops, setHops] = useState(0);
  const [power, setPower] = useState(0);

  const phaseRef = useRef<GamePhase>("intro");
  const resetRef = useRef<(() => void) | null>(null);

  const start = useCallback(() => {
    setHops(0);
    setPower(0);
    phaseRef.current = "playing";
    setPhase("playing");
    resetRef.current?.();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const stage = createStage(mount);
    const { scene, camera, renderer } = stage;

    camera.position.set(2, 4.6, 20);
    camera.lookAt(3, 1.2, 0);

    scene.background = nightSkyTexture({ glow: 0.86, seed: 4417 });
    scene.fog = new THREE.Fog(0x0d141c, 46, 130);
    addNightLights(scene);

    /* --- 海。ほぼ黒。地平線の残光だけが映る -------------------------------- */
    const sea = new THREE.Mesh(new THREE.PlaneGeometry(600, 400), toonMat(SEA, 30));
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.9;
    scene.add(sea);

    /* --- 遠景: テーブル型氷山（上面が平ら。とんがらせない） ---------------- */
    for (let i = 0; i < 9; i++) {
      const w = 14 + ((i * 17) % 22);
      const h = 3 + ((i * 7) % 5);
      const berg = new THREE.Mesh(new THREE.BoxGeometry(w, h, 8), toonMat(BERG, 3));
      berg.position.set(-90 + i * 26, h / 2 - 0.6, -70 - ((i * 13) % 26));
      scene.add(berg);
    }

    /* --- 自分（低ポリの人） ------------------------------------------------ */
    const me = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 8), toonMat(0xe8dcc6, 8));
    body.position.y = 1.05;
    body.add(outlineFor(body, 1.09));
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 10), toonMat(0xf0dcc0, 8));
    head.position.y = 1.95;
    head.add(outlineFor(head, 1.1));
    me.add(body, head);
    scene.add(me);

    /* --- 浮き氷 ------------------------------------------------------------ */
    const floes: Floe[] = [];
    function addFloe(left: number, width: number) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.7, 7), toonMat(ICE, 6));
      mesh.position.set(left + width / 2, -0.35, 0);
      mesh.add(outlineFor(mesh, 1.03));
      scene.add(mesh);
      floes.push({ mesh, left, right: left + width });
    }

    /** 次の氷を、いまの足場の右端から `d` 離した位置に置く */
    function addNext() {
      const d = cfg.dMin + Math.random() * (cfg.dMax - cfg.dMin);
      addFloe(d, cfg.width);
    }

    let charging = false;
    let charge = 0;
    let jumping = false;
    let jumpT = 0;
    let jumpFrom = 0;
    let jumpTo = 0;
    let landOk = false;
    let done = 0;
    let shift = 0; // 世界をずらす量（自分は常に x=0 に立っている見立て）

    resetRef.current = () => {
      floes.forEach((f) => scene.remove(f.mesh));
      floes.length = 0;
      charging = false;
      charge = 0;
      jumping = false;
      done = 0;
      shift = 0;
      /* 足元の氷は広めに置く（開始直後に落ちない） */
      addFloe(-4, 8);
      addNext();
      me.position.set(0, 0, 0);
    };

    const release = () => {
      if (!charging || jumping || phaseRef.current !== "playing") return;
      charging = false;
      const dist = JUMP_MIN + charge * (JUMP_MAX - JUMP_MIN);
      /* 着地できるか: 次の氷の範囲に入っているか */
      const target = floes.find((f) => f.left <= dist && dist <= f.right && f.right > 0.5);
      landOk = !!target;
      jumpFrom = 0;
      jumpTo = dist;
      jumpT = 0;
      jumping = true;
    };

    const press = () => {
      if (jumping || phaseRef.current !== "playing") return;
      charging = true;
      charge = 0;
    };

    /* 挑戦前の画面でも足場が見えるように、最初から一度組んでおく
       （これが無いと intro では人が海の上に浮いて見える） */
    resetRef.current?.();

    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      if (phaseRef.current === "playing") {
        if (charging) {
          charge = Math.min(1, charge + (dt * 1000) / cfg.chargeMs);
          setPower(charge);
          /* 溜めると沈み込む */
          me.position.y = -charge * 0.22;
        }

        if (jumping) {
          jumpT += (dt * 1000) / JUMP_MS;
          const p = Math.min(1, jumpT);
          const x = jumpFrom + (jumpTo - jumpFrom) * p;
          /* 放物線。着地に失敗したら、そのまま海へ落ちる */
          const arc = Math.sin(p * Math.PI) * 2.6;
          me.position.set(0, arc + (landOk ? 0 : p > 0.72 ? -(p - 0.72) * 26 : 0), 0);
          shift = x;
          floes.forEach((f) => {
            f.mesh.position.x = f.left + (f.right - f.left) / 2 - shift;
          });

          if (p >= 1) {
            jumping = false;
            setPower(0);
            charge = 0;
            if (!landOk) {
              phaseRef.current = "lost";
              setPhase("lost");
            } else {
              /* 着地。世界の原点を新しい足場に移す */
              floes.forEach((f) => {
                f.left -= jumpTo;
                f.right -= jumpTo;
              });
              shift = 0;
              floes.forEach((f) => {
                f.mesh.position.x = f.left + (f.right - f.left) / 2;
              });
              /* 後ろに流れた氷は捨てる */
              for (let i = floes.length - 1; i >= 0; i--) {
                if (floes[i].right < -14) {
                  scene.remove(floes[i].mesh);
                  floes.splice(i, 1);
                }
              }
              me.position.set(0, 0, 0);
              done += 1;
              setHops(done);
              if (done >= cfg.hops) {
                phaseRef.current = "won";
                setPhase("won");
              } else {
                addNext();
              }
            }
          }
        }
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(loop);

    const el = renderer.domElement;
    el.addEventListener("pointerdown", press);
    window.addEventListener("pointerup", release);
    const key = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      if (e.type === "keydown") press();
      else release();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("keyup", key);

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerdown", press);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("keydown", key);
      window.removeEventListener("keyup", key);
      stage.dispose();
    };
  }, [cfg.chargeMs, cfg.dMax, cfg.dMin, cfg.hops, cfg.width]);

  return (
    <GameShell
      title="パックアイスを渡れ"
      target={countryName}
      rule={
        <>
          押して踏み込みを溜め、放して跳ぶ。溜めるほど遠くへ跳ぶ。
          <br />
          足りなくても跳びすぎても海（ポリニヤ）に落ちる。{cfg.hops}回渡れ。
        </>
      }
      difficulty={level}
      itemId={itemId}
      phase={phase}
      hud={
        <>
          <span>
            渡った {hops} / {cfg.hops}
          </span>
        </>
      }
      overlay={
        <div className="w-full max-w-xs rounded-full border border-(--color-white)/30 bg-(--color-space)/70 p-[3px]">
          <div
            className="h-2 rounded-full bg-(--color-ember) transition-[width] duration-75"
            style={{ width: `${power * 100}%` }}
          />
        </div>
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
