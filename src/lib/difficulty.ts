import type { Level } from "@/lib/data";

/**
 * 「初回クリア率 ○○%」の出どころ。
 *
 * ★（level）だけだと難しさが体に来ないので、パーセントに翻訳して挑戦前に見せる。
 *
 * **数字の性質**: `MEASURED` に実測値が入っている項目はそれを出す。無い項目は
 * level から出した**設計上の想定値**（下の `EXPECTED`）を出す。
 * つまり今出ている数字は「この難易度で狙っている勝率」であって、まだ実測ではない。
 *
 * 実測に切り替える道筋:
 *  1. GTM/GA4 が動き出すと `game_start` と `game_clear` が項目ごとに溜まる
 *  2. その項目の「初回の挑戦で勝てた人 ÷ 挑戦した人」を出して、この `MEASURED` に書く
 *     （Supabase に入れて取ってくる形にすれば、書き換えずに自動で最新になる）
 *  3. ゲートだけは `tools/sim-gate.mjs`（ゲームのロジックを再現したシミュレータ）で
 *     初心者モデルを何百回も走らせた実測があるので、それを入れてある
 *
 * ★と矛盾させないため、想定値は level の関数として一箇所で決める
 * （項目ごとに勘で数字を置くと、★4より★5の方が高い、という事故が起きる）。
 */

/** level → 初回クリア率の想定値(%) */
const EXPECTED: Record<Level, number> = {
  1: 62,
  2: 48,
  3: 35,
  4: 23,
  5: 12,
};

/**
 * 実測値(%)。id は解錠キー（`turkey` / `p3` / `tennis` / `career` / `gate`）。
 * ここに入れた項目だけ、想定値ではなく実測が出る。
 */
const MEASURED: Record<string, number> = {
  /* tools/sim-gate.mjs の初心者モデルで計測した値（DESIGN.md 2026-08-17 の節） */
  gate: 55,
  /* tools/sim-balloon.mjs で計測（初見 60.8% / 慣れた人 99.5%） */
  turkey: 61,
  /* tools/sim-iceflow.mjs で計測（初見 12.3% / 慣れた人 100%）。
     2026-08-23にゲージへ「乗れる幅」の帯を出したので、人間の実測はこれより
     易しくなっているはず（シミュレータは数値を直接見ているため差が出ない）。
     GA4が溜まったら実測で置き換える */
  antarctica: 12,
};

export type ClearRate = { percent: number; measured: boolean };

export function clearRate(id: string, level: Level): ClearRate {
  const m = MEASURED[id];
  if (typeof m === "number") return { percent: m, measured: true };
  return { percent: EXPECTED[level], measured: false };
}
