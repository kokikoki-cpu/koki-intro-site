"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadTexture, optimizedSrc } from "./games/three-kit";

const RADIUS = 8.6;
const CARD_W = 3.7;
const CARD_H = 2.45;
const FRAME = 0.13;

/** ページ背景と同じ色。キャンバスの縁が背景に溶けるようにする（globals.css の --color-bg） */
const BG = 0xf0ede4;
const INK = 0x1a1c16;

export default function HeroStage3D({ photos }: { photos: string[] }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount || photos.length === 0) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, RADIUS + 1.5, RADIUS * 3.4);

    const w = Math.max(mount.clientWidth, 1);
    const h = Math.max(mount.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(46, w / h, 0.1, 90);

    /** 縦長（スマホ）では寄って画角を広げ、写真が画面いっぱいに見えるようにする */
    function fitCamera(vw: number, vh: number) {
      const portrait = vw < vh;
      camera.fov = portrait ? 56 : 46;
      camera.position.z = RADIUS + (portrait ? 5.4 : 7.4);
      camera.aspect = vw / vh;
      camera.updateProjectionMatrix();
    }
    fitCamera(w, h);
    camera.position.y = 0.7;
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xfffaf0, 0x8a8270, 1.5));
    const key = new THREE.DirectionalLight(0xfff6e6, 0.7);
    key.position.set(-4, 6, 8);
    scene.add(key);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // --- 写真を円周に並べる ---
    const ring = new THREE.Group();
    scene.add(ring);

    const cardGeo = new THREE.PlaneGeometry(CARD_W, CARD_H);
    const frameGeo = new THREE.PlaneGeometry(CARD_W + FRAME * 2, CARD_H + FRAME * 2);
    const frameMat = new THREE.MeshBasicMaterial({ color: INK });
    const cardMats: THREE.MeshBasicMaterial[] = [];

    let disposed = false;

    photos.forEach((src, i) => {
      const angle = (i / photos.length) * Math.PI * 2;
      const holder = new THREE.Group();
      holder.position.set(Math.sin(angle) * RADIUS, 0, Math.cos(angle) * RADIUS);
      holder.rotation.y = angle;

      // 雑誌的な非対称さを出すため、1枚ごとに高さと傾きをずらす
      holder.position.y = (i % 3 - 1) * 0.72;
      holder.rotation.z = ((i % 5) - 2) * 0.022;

      const frame = new THREE.Mesh(frameGeo, frameMat);
      frame.position.z = -0.01;
      holder.add(frame);

      const mat = new THREE.MeshBasicMaterial({ color: 0xd9d3c4 });
      cardMats.push(mat);
      holder.add(new THREE.Mesh(cardGeo, mat));

      ring.add(holder);

      loadTexture(optimizedSrc(src, 640)).then((tex) => {
        if (disposed || !tex) return;
        tex.anisotropy = maxAniso;
        mat.map = tex;
        mat.color.setHex(0xffffff);
        mat.needsUpdate = true;
      });
    });

    // --- ドラッグで回す（離すと惰性で回り続ける） ---
    let spin = 0;
    let spinVel = 0;
    const AUTO = reduceMotion ? 0 : 0.0016;
    let dragging = false;
    let lastX = 0;
    const pointer = { x: 0, y: 0 };

    function onPointerDown(e: PointerEvent) {
      dragging = true;
      lastX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = (e.clientX - rect.left) / rect.width - 0.5;
      pointer.y = (e.clientY - rect.top) / rect.height - 0.5;
      if (!dragging) return;
      const dx = e.clientX - lastX;
      lastX = e.clientX;
      spinVel = -dx * 0.0022;
    }
    function endDrag(e: PointerEvent) {
      dragging = false;
      if (renderer.domElement.hasPointerCapture(e.pointerId)) {
        renderer.domElement.releasePointerCapture(e.pointerId);
      }
    }

    const el = renderer.domElement;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);

    const ro = new ResizeObserver(() => {
      const nw = mount.clientWidth;
      const nh = mount.clientHeight;
      if (nw === 0 || nh === 0) return;
      fitCamera(nw, nh);
      renderer.setSize(nw, nh, false);
    });
    ro.observe(mount);

    let raf = 0;
    function loop() {
      raf = requestAnimationFrame(loop);

      if (!dragging) {
        spinVel *= 0.94;
        if (Math.abs(spinVel) < 0.0002) spinVel = 0;
      }
      spin += spinVel + (dragging ? 0 : AUTO);
      ring.rotation.y = spin;

      // マウス位置にわずかに追従させて立体感を強調する
      const tx = pointer.x * 1.5;
      const ty = 0.7 - pointer.y * 1.1;
      camera.position.x += (tx - camera.position.x) * 0.05;
      camera.position.y += (ty - camera.position.y) * 0.05;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", endDrag);
      el.removeEventListener("pointercancel", endDrag);
      cardGeo.dispose();
      frameGeo.dispose();
      frameMat.dispose();
      for (const m of cardMats) {
        m.map?.dispose();
        m.dispose();
      }
      renderer.dispose();
      if (el.parentNode === mount) mount.removeChild(el);
    };
  }, [photos]);

  return <div ref={mountRef} className="absolute inset-0 touch-pan-y" aria-hidden />;
}
