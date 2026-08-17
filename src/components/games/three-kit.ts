import * as THREE from "three";

/** サイトのデザイントークンと揃えた3D用パレット（globals.css の :root と同じ色） */
export const PAL = {
  ink: 0x1a1c16,
  bg: 0xf0ede4,
  bgSoft: 0xe5e0d2,
  accent: 0x3f5c43,
  accentDark: 0x2c4230,
  clay: 0xa85630,
  white: 0xfffdf8,
} as const;

/** アウトライン（法線反転メッシュ）の色。全ゲームで共通のアニメ調の線 */
const OUTLINE_INK = 0x241608;

/**
 * 縦グラデーションの空テクスチャ。`sun` を渡すと、その高さにぼんやりした光源を足す。
 * scene.background に入れて使う。
 */
export function skyTexture(opts: {
  top: string;
  mid: string;
  bottom: string;
  sun?: { y: number; color?: string };
}): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, opts.top);
  grad.addColorStop(0.55, opts.mid);
  grad.addColorStop(1, opts.bottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  if (opts.sun) {
    const cy = size * opts.sun.y;
    const sun = ctx.createRadialGradient(size * 0.5, cy, 4, size * 0.5, cy, size * 0.42);
    sun.addColorStop(0, opts.sun.color ?? "rgba(255,255,235,0.92)");
    sun.addColorStop(1, "rgba(255,255,235,0)");
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, size, size);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * アニメ調のアウトライン。元メッシュに `add()` して重ねる。
 * 法線を反転（BackSide）した一回り大きいコピーを裏に描くことで輪郭線に見せる手法。
 */
export function outlineFor(mesh: THREE.Mesh, scale = 1.08): THREE.Mesh {
  const outline = new THREE.Mesh(
    mesh.geometry,
    new THREE.MeshBasicMaterial({ color: OUTLINE_INK, side: THREE.BackSide })
  );
  outline.scale.setScalar(scale);
  return outline;
}

/** フラットシェーディングのトゥーン調マテリアル（MeshToonMaterial は flatShading 非対応なので Phong を使う） */
export function toonMat(color: number, shininess = 8): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({ color, flatShading: true, shininess });
}

/** 起伏のある低ポリ地形。砂丘・コート・地面など各ゲームの「床」に使う */
export function lowPolyGround(opts: {
  color: number;
  size: number;
  amp?: number;
  y?: number;
  z?: number;
}): THREE.Mesh {
  const seg = 36;
  const amp = opts.amp ?? 1.4;
  const geo = new THREE.PlaneGeometry(opts.size, opts.size, seg, seg);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const h =
      Math.sin(x * 0.16 + 1.2) * amp +
      Math.sin(y * 0.11 - 0.5) * amp * 0.75 +
      Math.sin((x + y) * 0.05) * amp * 0.55;
    pos.setZ(i, h);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, toonMat(opts.color, 5));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = opts.y ?? -2.4;
  mesh.position.z = opts.z ?? 0;
  return mesh;
}

/** 全ゲーム共通のライティング（夕方の空 + 斜め上からの主光源） */
export function addLights(scene: THREE.Scene, skyColor = 0xfff2d6, groundColor = 0x7a4a2c) {
  scene.add(new THREE.HemisphereLight(skyColor, groundColor, 1.05));
  const sun = new THREE.DirectionalLight(0xfff0d0, 1.15);
  sun.position.set(-6, 10, 6);
  scene.add(sun);
}

/**
 * Next.js の画像最適化エンドポイント経由でテクスチャ用のURLを作る。
 * 元画像はスマホ撮影の巨大JPEGなので、そのままテクスチャにするとGPUメモリを食う。
 *
 * 注意: `w` は next.config の deviceSizes / imageSizes に、`q` は images.qualities に
 * 含まれる値しか受け付けられない（外れると 400 が返る）。どちらも既定値のままなので
 * w は 640 など deviceSizes の値、q は 75 に固定しておく。
 */
export function optimizedSrc(src: string, w: 384 | 640 | 750 | 1080 = 640): string {
  return `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;
}

/** テクスチャを読み込んで sRGB を設定する。読み込み失敗時は null で解決（描画は続行する） */
export function loadTexture(src: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(
      src,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        resolve(tex);
      },
      undefined,
      () => resolve(null)
    );
  });
}

export type Stage = {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** レンダラー・ジオメトリ・マテリアル・テクスチャをまとめて破棄し、canvas を DOM から外す */
  dispose: () => void;
};

/**
 * mount 要素いっぱいに WebGL キャンバスを敷いてシーンを用意する。
 * リサイズ追従（ResizeObserver）と破棄処理まで面倒を見る。
 */
export function createStage(mount: HTMLElement, opts?: { fov?: number; far?: number }): Stage {
  const scene = new THREE.Scene();
  const w = Math.max(mount.clientWidth, 1);
  const h = Math.max(mount.clientHeight, 1);

  const camera = new THREE.PerspectiveCamera(opts?.fov ?? 55, w / h, 0.1, opts?.far ?? 300);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(w, h, false);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";
  renderer.domElement.style.display = "block";
  mount.appendChild(renderer.domElement);

  const ro = new ResizeObserver(() => {
    const nw = mount.clientWidth;
    const nh = mount.clientHeight;
    if (nw === 0 || nh === 0) return;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh, false);
  });
  ro.observe(mount);

  return {
    scene,
    camera,
    renderer,
    dispose() {
      ro.disconnect();
      scene.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          const mat = m as THREE.Material & { map?: THREE.Texture | null };
          mat.map?.dispose();
          mat.dispose();
        }
      });
      if (scene.background instanceof THREE.Texture) scene.background.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    },
  };
}

/** ゲームの進行状態。全ゲームで共通 */
export type GamePhase = "intro" | "playing" | "won" | "lost";
