"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";

/** 音量。BGMなので控えめに。上げると詐欺師ゲームの操作感を邪魔する */
const VOLUME = 0.3;
const PREF_KEY = "koki-bgm-muted";

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
    play();

    const kick = () => play();
    window.addEventListener("pointerdown", kick, { once: true });
    window.addEventListener("keydown", kick, { once: true });
    return () => {
      window.removeEventListener("pointerdown", kick);
      window.removeEventListener("keydown", kick);
    };
  }, [muted, play]);

  // 動画（クリア後のモンゴル動画）が鳴っている間はBGMを止めて、音が重ならないようにする。
  // メディアのイベントは伝播しないが、キャプチャなら document でも拾える
  useEffect(() => {
    const isVideo = (t: EventTarget | null) => t instanceof HTMLVideoElement;

    const onPlay = (e: Event) => {
      if (isVideo(e.target)) audioRef.current?.pause();
    };
    const onStop = (e: Event) => {
      if (!isVideo(e.target)) return;
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
      <button
        onClick={toggle}
        aria-label={muted ? "BGMを鳴らす" : "BGMを止める"}
        aria-pressed={!muted}
        title={muted ? "BGMを鳴らす" : "BGMを止める"}
        className="fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full border border-(--color-white)/25 bg-(--color-ink)/85 text-(--color-white) backdrop-blur-sm transition hover:border-(--color-accent-light) hover:bg-(--color-accent-dark)"
      >
        {muted ? <IconMuted /> : <IconSound />}
      </button>
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
