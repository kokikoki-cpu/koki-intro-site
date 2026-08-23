"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

/** 音量。BGMなので控えめに。上げると詐欺師ゲームの操作感を邪魔する */
const VOLUME = 0.3;
const PREF_KEY = "koki-bgm-muted";

/** 流している曲 */
const TRACK = { title: "宇宙海賊", artist: "もりつぐ" };

/**
 * サイト共通のBGM。
 *
 * ブラウザは「ユーザーが何か操作するまで音を出す再生」を禁止しているので、
 * 最初のクリック/キー入力を拾って再生を始める（勝手には鳴らない）。
 * 音源は `preload="none"` にしてあり、鳴らすと決まるまでダウンロードしない＝
 * ページの初期表示を重くしない。
 */
/* localStorage は React の外の状態なので useSyncExternalStore で購読する。
   effect の中で setState すると描画が二度手間になるうえ lint に弾かれる。 */
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getMuted() {
  return window.localStorage.getItem(PREF_KEY) === "1";
}
/** サーバー描画時は「消音」として扱う（音が鳴る前提で描かない） */
function getServerMuted() {
  return true;
}
function setMutedPref(next: boolean) {
  window.localStorage.setItem(PREF_KEY, next ? "1" : "0");
  for (const l of listeners) l();
}

export default function BgmPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // 前回「消す」を選んでいたら、その意思を尊重する
  const muted = useSyncExternalStore(subscribe, getMuted, getServerMuted);

  const play = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = VOLUME;
    // 端末やタブの状態によっては弾かれるので、失敗しても黙って諦める
    el.play().catch(() => {});
  }, []);

  // 最初の操作をきっかけに鳴らし始める
  useEffect(() => {
    if (muted) return;
    const el = audioRef.current;
    if (!el) return;

    if (!el.paused) return;

    /* **ここで play() を呼んではいけない**。自動再生はブラウザに弾かれるのに、
       ブラウザは再生を試みるために音源のダウンロードを始めてしまう。
       2.1MB の BGM が初期表示と競合して、開くのが遅くなっていた（実測 3.7MB のうち
       2.2MB がこれ）。最初の操作を待ってから鳴らす。 */
    const kick = () => play();
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [muted, play]);

  // 他の音（クリア後のモンゴル動画、オープニングの曲）が鳴っている間はBGMを止めて、
  // 音が重ならないようにする。
  // メディアのイベントは伝播しないが、キャプチャなら document でも拾える
  useEffect(() => {
    /* 自分以外のメディアかどうか。<audio> も見るのは、オープニングの曲が
       ここと同じ <audio> で鳴るため。自分自身を弾かないと、再生した瞬間に
       自分を止めてしまう */
    const isOtherMedia = (t: EventTarget | null) =>
      t instanceof HTMLVideoElement ||
      (t instanceof HTMLAudioElement && t !== audioRef.current);

    const onPlay = (e: Event) => {
      if (isOtherMedia(e.target)) audioRef.current?.pause();
    };
    const onStop = (e: Event) => {
      if (!isOtherMedia(e.target)) return;
      if (muted) return;
      play();
    };

    document.addEventListener("play", onPlay, true);
    document.addEventListener("pause", onStop, true);
    document.addEventListener("ended", onStop, true);
    return () => {
      document.removeEventListener("play", onPlay, true);
      document.removeEventListener("pause", onStop, true);
      document.removeEventListener("ended", onStop, true);
    };
  }, [muted, play]);

  const toggle = () => {
    const next = !muted;
    setMutedPref(next);
    if (next) audioRef.current?.pause();
    else play();
  };

  return (
    <>
      <audio ref={audioRef} src="/audio/bgm.m4a" loop preload="none" />

      {/* z-120: ゲートやゲームのオーバーレイ(z-100/110)より前。いつでも消せるようにする */}
      <div className="fixed bottom-4 right-4 z-120 flex items-center gap-2">
        {!muted && (
          <span className="hidden rounded-full border border-(--color-white)/20 bg-(--color-ink)/85 px-3 py-1.5 text-xs text-(--color-bg-soft)/80 backdrop-blur-sm sm:block">
            ♫ {TRACK.title} / {TRACK.artist}
          </span>
        )}
        <button
          onClick={toggle}
          aria-label={muted ? `BGMを鳴らす（${TRACK.title} / ${TRACK.artist}）` : "BGMを止める"}
          aria-pressed={!muted}
          title={`${TRACK.title} / ${TRACK.artist}`}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-(--color-white)/25 bg-(--color-ink)/85 text-(--color-white) backdrop-blur-sm transition hover:border-(--color-ember) hover:bg-(--color-nebula)"
        >
          {muted ? <IconMuted /> : <IconSound />}
        </button>
      </div>
    </>
  );
}

function IconSound() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );
}

function IconMuted() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" />
      <path d="M17 9.5l4 5M21 9.5l-4 5" />
    </svg>
  );
}
