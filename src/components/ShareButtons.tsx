"use client";

import { useState } from "react";
import { track } from "@/lib/track";

/**
 * シェア。要件⑥のもう半分（リアクション行動）。
 *
 * サーバは要らない。端末が持っている共有機能（Web Share API）が使えるならそれを開き、
 * 使えない環境（多くのPCブラウザ）では X / LINE / URLコピー を並べる。
 *
 * GA4には `share_method` を送る（カスタムディメンション）。
 * どの経路で共有されたかが分かると、次にどこへ置くかの判断材料になる。
 */

const SITE_URL = "https://koki-intro-site.vercel.app/";
const SHARE_TEXT = "Who am I ? 清水航樹の自己紹介サイト";

export default function ShareButtons() {
  const [copied, setCopied] = useState(false);

  const send = (method: string) => {
    track("reaction_share", { share_method: method, item_id: "site" });
  };

  /** 端末の共有シート。対応していない環境では何も起きないよう、呼ぶ前に確認する */
  const nativeShare = async () => {
    if (typeof navigator === "undefined" || !navigator.share) return;
    try {
      await navigator.share({ title: SHARE_TEXT, text: SHARE_TEXT, url: SITE_URL });
      send("native");
    } catch {
      /* ユーザーが共有シートを閉じただけ。何も起きなかったことにする */
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SITE_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
      send("copy");
    } catch {
      /* 権限が無い環境ではコピーできない。ボタンは黙って何もしない */
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      <span className="font-display text-sm font-extrabold text-(--color-ember)">
        このサイトをシェア
      </span>

      {canNativeShare && (
        <button
          onClick={nativeShare}
          className="rounded-full border-2 border-(--color-ember)/55 px-5 py-2 font-display text-sm font-extrabold text-(--color-bg-soft)/90 transition hover:bg-(--color-ember) hover:text-(--color-space) active:scale-95"
        >
          共有する
        </button>
      )}

      <a
        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SITE_URL)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => send("x")}
        className="rounded-full border-2 border-(--color-ember)/55 px-5 py-2 font-display text-sm font-extrabold text-(--color-bg-soft)/90 transition hover:bg-(--color-ember) hover:text-(--color-space) active:scale-95"
      >
        X
      </a>

      <a
        href={`https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(SITE_URL)}`}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => send("line")}
        className="rounded-full border-2 border-(--color-ember)/55 px-5 py-2 font-display text-sm font-extrabold text-(--color-bg-soft)/90 transition hover:bg-(--color-ember) hover:text-(--color-space) active:scale-95"
      >
        LINE
      </a>

      <button
        onClick={copy}
        className="rounded-full border-2 border-(--color-ember)/55 px-5 py-2 font-display text-sm font-extrabold text-(--color-bg-soft)/90 transition hover:bg-(--color-ember) hover:text-(--color-space) active:scale-95"
      >
        {copied ? "コピーした" : "URLをコピー"}
      </button>
    </div>
  );
}
