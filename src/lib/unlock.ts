"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { COUNTRIES, PEOPLE, SPORTS } from "@/lib/data";
import { track, type MemoryCategory } from "@/lib/track";

/**
 * 各セクションの「ゲームをクリアしたら中身が見られる」解錠状態を sessionStorage で管理する。
 * タブを閉じたらリセットされる（＝次の来訪者はまた最初から遊べる）のが狙いなので localStorage は使わない。
 *
 * sessionStorage は React の外にある状態なので、`useSyncExternalStore` で購読する。
 * これにより SSR（未解錠として描画）とクライアントの食い違いも React 側が面倒を見てくれる。
 */

export const PASSPHRASE = "こうきいつもありがとう";

const ALL_KEY = "koki-unlock-all";
const ITEM_PREFIX = "koki-unlocked:";
/** 「合言葉で全部開いた」状態を表すスナップショット値 */
const ALL_TOKEN = "*";

const listeners = new Set<() => void>();
let snapshot = "";
let dirty = true;

function readSnapshot(): string {
  if (typeof window === "undefined") return "";
  if (!dirty) return snapshot;

  if (window.sessionStorage.getItem(ALL_KEY) === "1") {
    snapshot = ALL_TOKEN;
  } else {
    const ids: string[] = [];
    for (let i = 0; i < window.sessionStorage.length; i++) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith(ITEM_PREFIX)) ids.push(key.slice(ITEM_PREFIX.length));
    }
    snapshot = ids.sort().join(",");
  }
  dirty = false;
  return snapshot;
}

function emit() {
  dirty = true;
  for (const l of listeners) l();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** SSR 時とハイドレーション初回は「何も解錠していない」として描画する */
function serverSnapshot(): string {
  return "";
}

/* 解錠された id がどの種別なのかを引く表。計測の内訳（国/人/スポーツ/職歴）に使う。
   data.ts が唯一の情報源なので、項目を足せばここも自動で追随する。 */
const CATEGORY_OF: Record<string, MemoryCategory> = {
  ...Object.fromEntries(COUNTRIES.map((c) => [c.id, "country" as const])),
  ...Object.fromEntries(PEOPLE.map((p) => [p.id, "person" as const])),
  ...Object.fromEntries(SPORTS.map((s) => [s.id, "sport" as const])),
  career: "career",
};

/** 集める対象の総数。トップの `20 / 20` と同じ数え方（職歴の1つを足す） */
export const MEMORY_TOTAL = COUNTRIES.length + PEOPLE.length + SPORTS.length + 1;

/** いま何個そろっているか。計測用（描画は useUnlockedFrom 側を使う） */
function countUnlocked(): number {
  if (typeof window === "undefined") return 0;
  if (window.sessionStorage.getItem(ALL_KEY) === "1") return MEMORY_TOTAL;
  let n = 0;
  for (let i = 0; i < window.sessionStorage.length; i++) {
    if (window.sessionStorage.key(i)?.startsWith(ITEM_PREFIX)) n++;
  }
  return n;
}

export function unlock(id: string): void {
  if (typeof window === "undefined") return;
  const already = window.sessionStorage.getItem(ITEM_PREFIX + id) === "1";
  window.sessionStorage.setItem(ITEM_PREFIX + id, "1");
  emit();

  /* 解錠はすべてこの関数を通るので、計測もここ1箇所で足りる
     （各ゲームに書くと必ずどれか書き忘れる）。
     すでに開いている物を開き直した時は送らない＝二重計上を防ぐ。 */
  if (already) return;
  const collected = countUnlocked();
  track("memory_unlocked", {
    item_id: id,
    category: CATEGORY_OF[id] ?? "country",
    collected,
    total: MEMORY_TOTAL,
  });
  if (collected >= MEMORY_TOTAL) {
    track("all_memories_collected", { total: MEMORY_TOTAL });
  }
}

/** 合言葉が正しければ全解錠して true を返す */
export function tryPassphrase(input: string, from = "unknown"): boolean {
  if (input.trim() !== PASSPHRASE) return false;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(ALL_KEY, "1");
    emit();
    /* 「ゲームを諦めて合言葉に逃げた」数。難易度が高すぎるかの判断材料になる */
    track("passphrase_unlock_all", { from });
  }
  return true;
}

function has(snap: string, id: string): boolean {
  if (snap === ALL_TOKEN) return true;
  if (snap === "") return false;
  return snap.split(",").includes(id);
}

/** ひとつの id の解錠状態を購読する */
export function useIsUnlocked(id: string): boolean {
  const snap = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);
  return has(snap, id);
}

/**
 * 渡した id 群のうち解錠済みのものを Set で返す。
 * `ids` は毎回同じ配列（モジュールスコープの定数など）を渡すこと。
 */
export function useUnlockedFrom(ids: string[]): Set<string> {
  const snap = useSyncExternalStore(subscribe, readSnapshot, serverSnapshot);
  return useMemo(() => {
    if (snap === ALL_TOKEN) return new Set(ids);
    return new Set(ids.filter((id) => has(snap, id)));
  }, [snap, ids]);
}

/** 「全部開けた？」を知りたい時に使う（合言葉スキップ後の分岐など） */
export function useUnlockAllCallback(): () => void {
  return useCallback(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(ALL_KEY, "1");
    emit();
  }, []);
}
