"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";

/**
 * `data-track="キー"` が付いた要素のクリックを、まとめて1つのリスナーで拾う。
 *
 * 設計の理由: ボタンごとに onClick で計測を書くと、**新しいボタンを足したときに
 * 必ず書き忘れる**。属性を1つ付けるだけで計測される形にしておけば、
 * 「キーを付ける」ことだけ守れば漏れない。
 *
 * キーの付け方（GA4 のレポートで並ぶので命名を揃える）:
 *   `<画面>-<対象>-<動作>`   例: `opening-start`, `world-pin-turkey`, `memory-open`
 * 小文字とハイフンだけ。日本語やスペースは使わない。
 */
export default function TrackClicks() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-track]");
      if (!el) return;
      const key = el.getAttribute("data-track");
      if (!key) return;
      /* ラベルは中身のテキストから拾う（別の属性を用意すると、必ず片方だけ更新されて食い違う） */
      const label = (el.textContent ?? "").trim().slice(0, 60) || undefined;
      track("cta_click", { track_key: key, label });
    };

    /* capture: true にしておく。押した直後に画面が切り替わって要素が消えるボタン
       （ゲーム開始など）でも、先にこちらが拾える */
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  return null;
}
