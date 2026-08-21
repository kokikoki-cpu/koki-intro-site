"use client";

import { useEffect, useState, type ReactNode, type RefObject } from "react";
import { tryPassphrase } from "@/lib/unlock";
import { clearRate } from "@/lib/difficulty";
import { preloadSfx, sfx } from "@/lib/sfx";
import type { GamePhase } from "./three-kit";

type Props = {
  /** ゲームの名前（例: 「その国へ飛べ」） */
  title: string;
  /** 何を解錠しようとしているか（例: 「トルコ」） */
  target: string;
  /** 遊び方の説明。1〜2行に収める */
  rule: ReactNode;
  /** 難易度（1〜5）。挑戦前に★で示す */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** 解錠キー。初回クリア率の実測値を引くのに使う（無ければ level からの想定値） */
  itemId?: string;
  phase: GamePhase;
  /** プレイ中に出すスコア等 */
  hud?: ReactNode;
  /** キャンバスの上に重ねる表示（到達地点の名前など）。プレイ中だけ出る */
  overlay?: ReactNode;
  /** Three.js のキャンバスを挿す先 */
  mountRef: RefObject<HTMLDivElement | null>;
  /** 3Dを使わないゲーム用。渡すと既定のマウント用 div の代わりにこれを描く */
  canvas?: ReactNode;
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
  difficulty,
  itemId,
  phase,
  hud,
  overlay,
  mountRef,
  canvas,
  onStart,
  onRetry,
  onClose,
  onReveal,
  onUnlockAll,
}: Props) {
  const [showPass, setShowPass] = useState(false);
  const [passInput, setPassInput] = useState("");
  const [passError, setPassError] = useState(false);

  /* 開いた時点で効果音を先読みする。押した瞬間に鳴らないと手応えが消える */
  useEffect(() => {
    preloadSfx();
  }, []);

  /* クリアの音はここ1箇所。全ゲームがこのシェルを通るので、各ゲームに書かなくてよい */
  useEffect(() => {
    if (phase === "won") sfx("clear");
  }, [phase]);

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
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-3 overflow-y-auto bg-(--color-space) px-4 py-6 text-(--color-white)">
      <div className="text-center">
        <p className="text-xs tracking-widest text-(--color-bg-soft)/60">{target}</p>
        <h2 className="font-display text-2xl font-bold md:text-3xl">{title}</h2>
      </div>

      {phase === "intro" && (
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-lg tracking-[0.3em] text-(--color-ember)" aria-label={`難易度 ${difficulty} / 5`}>
            {"★".repeat(difficulty)}
            <span className="text-(--color-white)/25">{"★".repeat(5 - difficulty)}</span>
          </p>
          <ClearRate id={itemId ?? ""} level={difficulty} />
          <div className="max-w-sm text-sm text-(--color-bg-soft)">{rule}</div>
          <button
            onClick={onStart}
            className="btn-ember btn-ember--solid px-8 py-3"
          >
            挑戦する
          </button>
        </div>
      )}

      {phase === "playing" && hud && (
        <div className="flex items-center gap-6 text-sm font-bold">{hud}</div>
      )}

      <div className="relative w-[min(92vw,620px)]">
        <div className="aspect-16/10 w-full touch-none overflow-hidden rounded-lg border-2 border-(--color-line) bg-black">
          {canvas ?? <div ref={mountRef} className="h-full w-full" />}
        </div>

        {phase === "playing" && overlay && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center px-4">
            {overlay}
          </div>
        )}

        {phase === "lost" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-black/78 text-center">
            <p className="font-display text-2xl font-bold">また今度だな</p>
            <div className="flex gap-2">
              <button
                onClick={onRetry}
                className="btn-ember px-6 py-2 text-sm"
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
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-(--color-space)/88 text-center">
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
                className="btn-ember px-4 py-2 text-sm"
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

/**
 * 「初回クリア率 ○○%」。★を体に来る数字に翻訳して、挑戦前の高揚を作るための表示。
 * 数字の出どころは lib/difficulty.ts（実測が無い項目は level からの想定値）。
 */
function ClearRate({ id, level }: { id: string; level: 1 | 2 | 3 | 4 | 5 }) {
  const { percent } = clearRate(id, level);
  return (
    <p className="m-0 flex items-baseline gap-1.5">
      <span className="text-xs font-bold text-(--color-bg-soft)/70">初回クリア率</span>
      <span className="font-display text-2xl font-extrabold leading-none text-(--color-ember)">
        {percent}
        <span className="text-sm">%</span>
      </span>
    </p>
  );
}
