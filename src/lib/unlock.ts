"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

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

export function unlock(id: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(ITEM_PREFIX + id, "1");
  emit();
}

/** 合言葉が正しければ全解錠して true を返す */
export function tryPassphrase(input: string): boolean {
  if (input.trim() !== PASSPHRASE) return false;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(ALL_KEY, "1");
    emit();
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
