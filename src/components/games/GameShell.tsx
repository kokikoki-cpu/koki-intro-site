"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { tryPassphrase } from "@/lib/unlock";
import type { GamePhase } from "./three-kit";

type Props = {
  /** ゲームの名前（例: 「その国へ飛べ」） */
  title: string;
  /** 何を解錠しようとしているか（例: 「トルコ」） */
  target: string;
  /** 遊び方の説明。1〜2行に収める */
  rule: ReactNode;
  phase: GamePhase;
  /** プレイ中に出すスコア等 */
  hud?: ReactNode;
  /** Three.js のキャンバスを挿す先 */
  mountRef: RefObject<HTMLDivElement | null>;
  onStart: () => void;
  onRetry: () => void;
  /** 閉じる（解錠しない） */
  onClose: () => void;
  /** クリア後に中身を見せる */
  onReveal: () => void;
  /** 合言葉で全解錠された時 */
  onUnlockAll: () => void;
};

export default function GameShell({
  title,
  target,
  rule,
  phase,
  hud,
  mountRef,
  onStart,
  onRetry,
  onClose,
  onReveal,
  onUnlockAll,
}: Props) {
  const [showPass, setShowPass] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);

  // 開いている間は背面のスクロールを止める
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const checkPass = () => {
    if (tryPassphrase(passInput)) {
      onUnlockAll();
    } else {
      setPassError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-(--color-ink) px-4 py-6 text-(--color-white)">
      <div className="text-center">
        <p className="text-xs tracking-widest text-(--color-bg-soft)/60">{target}</p>
        <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
      </div>

      {phase === "intro" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="max-w-sm text-sm text-(--color-bg-soft)">{rule}</div>
          <button
            onClick={onStart}
            className="rounded-full bg-(--color-accent) px-8 py-3 font-bold text-(--color-white) transition hover:bg-(--color-accent-dark)"
          >
            挑戦する
          </button>
        </div>
      )}

      {phase === "playing" && hud && (
        <div className="flex items-center gap-6 text-sm font-bold">{hud}</div>
      )}

      <div className="relative w-[min(92vw,620px)]">
        <div
          ref={mountRef}
          className="aspect-16/10 w-full touch-none overflow-hidden rounded-lg border-2 border-(--color-line) bg-black"
        />

        {phase === "lost" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/78 text-center">
            <p className="font-display text-2xl font-bold">また今度だな</p>
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="rounded-full bg-(--color-accent) px-6 py-2 text-sm font-bold transition hover:bg-(--color-accent-dark)"
              >
                もう一度
              </button>
              <button
                onClick={onClose}
                className="rounded-full border border-(--color-line) px-6 py-2 text-sm font-bold transition hover:bg-white/10"
              >
                やめる
              </button>
            </div>
          </div>
        )}

        {phase === "won" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-(--color-accent-dark)/90 text-center">
            <p className="font-display text-3xl font-bold">解錠</p>
            <p className="text-sm text-(--color-bg-soft)">{target} の中身が見られるようになった</p>
            <button
              onClick={onReveal}
              className="rounded-full bg-(--color-white) px-8 py-3 font-bold text-(--color-ink) transition hover:bg-(--color-bg-soft)"
            >
              見る →
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        {!showPass ? (
          <button
            onClick={() => setShowPass(true)}
            className="text-xs text-(--color-bg-soft)/70 underline underline-offset-2"
          >
            クリアできない人は合言葉を入れるとスキップできるよ♡
          </button>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-2">
              <input
                value={passInput}
                onChange={(e) => {
                  setPassInput(e.target.value);
                  setPassError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && checkPass()}
                placeholder="合言葉"
                className="rounded-full border border-(--color-line) bg-(--color-white) px-4 py-2 text-sm text-(--color-ink) outline-none"
              />
              <button
                onClick={checkPass}
                className="rounded-full bg-(--color-accent) px-4 py-2 text-sm font-bold"
              >
                入る
              </button>
            </div>
            {passError && <p className="text-xs text-(--color-clay)">合言葉が違います</p>}
          </div>
        )}

        <button
          onClick={onClose}
          className="text-xs text-(--color-bg-soft)/50 underline underline-offset-2"
        >
          閉じる
        </button>
      </div>
    </div>
  );
}
