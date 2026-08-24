"use client";

import { useMemo, useSyncExternalStore } from "react";
import { track } from "@/lib/track";

/**
 * いいね。要件⑥（ユーザーリアクションをカスタムディメンション/メトリクスで返す）用。
 *
 * **保存はlocalStorageだけ**にしてある。サーバを持たせれば「他の人が何個押したか」も
 * 出せるが、このサイトの想定規模（数十人）では総数の分析価値がほとんど無く、
 * DBを一つ増やす対価に見合わない。押した本人には自分の印が残り、
 * GA4には全員分が集まるので、**分析に必要なものは計測側で足りる**。
 *
 * GA4に送る値の役割:
 * - `item_id` / `item_type` … カスタムディメンション（何にいいねが付くか）
 * - `like_count`            … カスタムメトリクス（数値でないとメトリクスにできない）。
 *                             その人がこれまでに押した総数。合計や平均が取れる
 * - `liked`                 … 付けたのか外したのかの区別
 *
 * localStorage は React の外の状態なので `useSyncExternalStore` で購読する
 * （BgmPlayer と同じ流儀。effect の中で setState すると描画が二度手間になり、
 *  lint にも弾かれる）。**スナップショットは生の文字列のまま返す**のが要点で、
 * ここで Set を作って返すと毎回別物になり、際限なく再描画される。
 */

const STORE_KEY = "koki-likes";

const listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** 生の文字列を返す。同じ内容なら同じ文字列になるので、再描画のループにならない */
function getSnapshot(): string {
  try {
    return window.localStorage.getItem(STORE_KEY) ?? "";
  } catch {
    /* プライベートモード等。いいねが押せないだけで済ませる */
    return "";
  }
}

/** サーバー描画時は「まだ何も押していない」として描く */
function getServerSnapshot(): string {
  return "";
}

function parseLikes(raw: string): Set<string> {
  if (!raw) return new Set();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeLikes(set: Set<string>): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify([...set]));
  } catch {
    /* 保存できなくても計測は飛ばす（GA4側の数字は残る） */
  }
  for (const l of listeners) l();
}

export default function LikeButton({
  itemId,
  itemType,
}: {
  itemId: string;
  itemType: string;
}) {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const likes = useMemo(() => parseLikes(raw), [raw]);

  const liked = likes.has(itemId);
  const myTotal = likes.size;

  const toggle = () => {
    const next = new Set(likes);
    const nowLiked = !next.has(itemId);
    if (nowLiked) next.add(itemId);
    else next.delete(itemId);
    writeLikes(next);

    track("reaction_like", {
      item_id: itemId,
      item_type: itemType,
      liked: nowLiked,
      like_count: next.size,
    });
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-1">
      <button
        onClick={toggle}
        aria-pressed={liked}
        aria-label={liked ? "いいねを外す" : "いいねする"}
        className={`inline-flex items-center gap-2 rounded-full border-2 px-5 py-2 font-display text-sm font-extrabold transition ${
          liked
            ? "border-(--color-clay) bg-(--color-clay) text-(--color-white)"
            : "border-(--color-ink) text-(--color-ink) hover:border-(--color-clay) hover:text-(--color-clay)"
        }`}
      >
        <span aria-hidden className="text-base leading-none">
          {liked ? "♥" : "♡"}
        </span>
        {liked ? "いいね済み" : "いいね"}
      </button>
      {myTotal > 0 && (
        <span className="text-xs text-(--color-ink-soft)">
          これまでに {myTotal} 個いいねした
        </span>
      )}
    </div>
  );
}
