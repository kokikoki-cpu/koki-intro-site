/**
 * 効果音。3つだけ。
 *
 * なぜ3つか: 「FFっぽさ」は音の本数ではなく**鳴るタイミング**で出る。
 *   命中（手応え）／被弾（焦り）／クリア（解放）
 * この3拍だけ押さえれば足りる。増やすと画面がうるさくなって、
 * 「動きは意味のある1つに絞る」というこのサイトの方針と喧嘩する。
 *
 * 音源は清水さんが持ってきたフリー効果音。
 * （FFXIV公式サウンドパックはスクウェア・エニックスの著作物なので使っていない）
 *
 * 消音は **BGMのスピーカーボタンと同じ状態を見る**（localStorage の同じキー）。
 * 別々に持つと「消したのに効果音だけ鳴る」ことになる。
 */

const BGM_MUTED_KEY = "koki-bgm-muted";

type SfxName = "hit" | "damage" | "clear";

/** 音量は個別に決める。命中は軽く、クリアだけはっきり鳴らす */
const SOURCES: Record<SfxName, { src: string; volume: number }> = {
  hit: { src: "/audio/sfx/hit.mp3", volume: 0.45 },
  damage: { src: "/audio/sfx/damage.mp3", volume: 0.32 },
  clear: { src: "/audio/sfx/clear.mp3", volume: 0.5 },
};

/** 元になる要素。1つ作って使い回し、同時再生は複製で作る */
const masters = new Map<SfxName, HTMLAudioElement>();

function master(name: SfxName): HTMLAudioElement {
  let el = masters.get(name);
  if (!el) {
    el = new Audio(SOURCES[name].src);
    el.preload = "auto";
    el.volume = SOURCES[name].volume;
    masters.set(name, el);
  }
  return el;
}

function muted(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(BGM_MUTED_KEY) === "1";
}

/**
 * 鳴らす。連続で呼ばれても重なるように、再生ごとに複製を使う
 * （同じ要素を使い回すと、前の音が途中で切れて「プツプツ」した鳴りになる）。
 */
export function sfx(name: SfxName): void {
  if (typeof window === "undefined" || muted()) return;
  try {
    const el = master(name).cloneNode() as HTMLAudioElement;
    el.volume = SOURCES[name].volume;
    /* 再生できない端末・自動再生を弾かれた場合は黙って諦める（ゲームは止めない） */
    void el.play().catch(() => {});
  } catch {
    /* Audio が作れない環境でもゲームは動く */
  }
}

/**
 * 先読み。ゲームを開いた時に呼ぶと、最初の1発が遅れない
 * （押した瞬間に鳴らないと手応えが消える）。
 */
export function preloadSfx(): void {
  if (typeof window === "undefined") return;
  (Object.keys(SOURCES) as SfxName[]).forEach((n) => {
    try {
      master(n).load();
    } catch {
      /* 失敗しても鳴らないだけ */
    }
  });
}
