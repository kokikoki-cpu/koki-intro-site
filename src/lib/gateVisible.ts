/**
 * 「オープニング（前口上）が画面を覆っているか」だけを持つ小さなストア。
 *
 * なぜ必要か: 前口上には専用の曲があり、右下には共通BGM（宇宙海賊）のボタンがある。
 * ボタンが見えていると、前口上を見ている最中にBGMを鳴らせてしまい、**音が二重になる**。
 * ShootingGameGate と BgmPlayer は親子ではなく layout 上の兄弟なので、
 * props では渡せない。React の外に置いて両方から触る。
 *
 * Context を使わない理由: 値は真偽ひとつで、変わるのは前口上の開始と終了の二回だけ。
 * Provider を挟むほどの規模ではないし、購読側は `useSyncExternalStore` で足りる
 * （BgmPlayer と LikeButton が既に同じ流儀）。
 */

let visible = false;
const listeners = new Set<() => void>();

export function setGateVisible(next: boolean): void {
  if (visible === next) return;
  visible = next;
  for (const l of listeners) l();
}

export function subscribeGateVisible(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getGateVisible(): boolean {
  return visible;
}

/**
 * サーバー描画時は「覆っている」として扱う。
 * 初回表示では前口上が必ず出るので、BGMボタンは**最初から隠れている**方が正しい
 * （出してから消すと一瞬ちらつく）。解錠済みの人には、前口上が閉じた時点で出る。
 */
export function getGateVisibleServer(): boolean {
  return true;
}
