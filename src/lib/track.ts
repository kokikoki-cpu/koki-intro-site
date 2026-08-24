/**
 * 計測の唯一の窓口（GTM の dataLayer に積むだけ）。
 *
 * 設計の理由:
 * - **イベント名とパラメータを型で固定する**。計測は表記ゆれ（`game_clear` と
 *   `gameClear` が混ざる、`country` と `item_id` が混ざる）で簡単に壊れる。
 *   ここを通す限り、GTM/GA4 側のタグ設定を後から作り直さなくて済む。
 * - **GTM が読み込まれていなくても落ちない**。`dataLayer` の配列だけ先に作って
 *   push しておけば、あとから GTM が読み込まれた時点でまとめて処理される
 *   （GTM 側の仕様。ローカル開発や広告ブロッカー環境でもゲームは普通に動く）。
 * - GA4 の推奨に合わせて名前は snake_case、40文字以内。
 *
 * GTM のコンテナIDは `.env.local` の `NEXT_PUBLIC_GTM_ID`（例: GTM-XXXXXXX）。
 * 未設定ならタグは読み込まれず、push だけが静かに溜まる。
 */

/** どのゲームか。GA4 のレポートで並ぶ名前なので、増やすときもこの短い ID を使う */
export type GameId =
  | "gate" // トップのゲート（詐欺師撃退）
  | "flight" // 世界地図: 輪をくぐる
  | "memory" // 人図鑑: 光った順を記憶
  | "sprint" // スポーツ: 連打で走る
  | "career" // 職歴: 壁のすき間
  | "battle" // 世界地図: エンカウントバトル（実装中）
  | "balloon" // トルコ: 気球（実装中）
  | "iceflow"; // 南極: 流氷渡り（実装中）

/** 記憶の種別。集めた数の内訳を見るために付ける */
export type MemoryCategory = "country" | "person" | "sport" | "career";

type Payload = Record<string, string | number | boolean | undefined>;

type Events = {
  /** オープニングの「ゲームスタート」を押した */
  opening_start: { skipped: boolean; elapsed_ms: number };
  /** 前口上を待たずに画面を押した／キーを叩いた */
  opening_skip: { elapsed_ms: number };
  /** ゲームを開始した（挑戦回数の分母になる） */
  game_start: { game_id: GameId; item_id: string; item_name: string; level?: number };
  /** クリアした */
  game_clear: {
    game_id: GameId;
    item_id: string;
    item_name: string;
    level?: number;
    duration_ms: number;
  };
  /** 失敗した */
  game_fail: {
    game_id: GameId;
    item_id: string;
    item_name: string;
    level?: number;
    duration_ms: number;
  };
  /** クリアせずに閉じた（＝難しすぎて諦めた の指標） */
  game_quit: { game_id: GameId; item_id: string; item_name: string; phase: string };
  /** 合言葉で全解錠した（＝ゲームを諦めた人の数） */
  passphrase_unlock_all: { from: string };
  /** 記憶を1つ手に入れた */
  memory_unlocked: {
    item_id: string;
    category: MemoryCategory;
    collected: number;
    total: number;
  };
  /** 記憶を全部集めた（＝豪華賞品に到達） */
  all_memories_collected: { total: number };
  /** その場で開くパネル（職歴・趣味・集めた記憶） */
  panel_open: { panel_id: string };
  /** ロケットでページ移動した */
  warp_navigate: { to: string };
  /** BGMの再生/停止 */
  bgm_toggle: { state: "play" | "pause" };
  /** data-track を付けた要素が押された（下記 TrackClicks から自動で飛ぶ） */
  cta_click: { track_key: string; label?: string };

  /* ---- 以下、GA4計測の要件（測定要件_TODO.md）のために追加 ---------------- */

  /**
   * SPAのページ遷移。WarpLink が `router.push()` を使うので、
   * ブラウザのページ読み込みは1回しか起きない。GTMの「ページビュー」トリガーでは
   * 2ページ目以降が取れないため、遷移を自前で送る。
   */
  spa_page_view: { page_path: string; page_title: string; pages_in_session: number };
  /** 同一セッションで3ページ以上見た。GA4側でキーイベントに指定する */
  three_pages_viewed: { pages_in_session: number };
  /**
   * スクロール到達（25/50/75/100）。スクロールできない画面では送らない。
   * `time_on_page_ms` を一緒に送ることで「その深さまで読むのに何秒かけたか」が分かる
   * ＝スクロール率と滞在時間の組み合わせ計測。
   */
  scroll_depth: {
    percent_scrolled: number;
    page_path: string;
    device_type: string;
    time_on_page_ms: number;
  };
  /**
   * 滞在時間の節目（15/30/60/120秒）。
   * このサイトはPCで画面に収まる設計なのでスクロールが起きず、深度だけでは
   * 「読まれたか」が測れない。**滞在時間の方が本命の指標になる**ため独立して送る。
   * 数えるのはタブが見えている間だけ（裏に回している時間は含めない）。
   */
  dwell_time: { seconds: number; page_path: string; device_type: string };
  /**
   * セッションの文脈。GTMのデータレイヤー変数として読ませるため、最初に1回だけ積む
   * （GTMは一度積まれた値を保持するので、以降のイベントからも参照できる）
   */
  session_context: {
    visit_count: number;
    entry_page: string;
    referrer_host: string;
    device_type: string;
  };
  /** ゲートを突破した。このサイトの離脱分析の主役になる指標 */
  gate_cleared: { method: "game" | "passphrase"; elapsed_ms: number };
  /** いいねを押した/外した */
  reaction_like: { item_id: string; item_type: string; liked: boolean; like_count: number };
  /** シェアした */
  reaction_share: { share_method: string; item_id: string };
};

declare global {
  interface Window {
    dataLayer?: Payload[];
  }
}

/** GTM の dataLayer に積む。ここ以外から dataLayer を直接触らないこと */
export function track<K extends keyof Events>(event: K, params: Events[K]): void {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event, ...params });
}

/**
 * ゲームの計測用の時計。`start()` の戻り値を持っておき、
 * クリア/失敗時に `since()` で経過ミリ秒を出す。
 * 「何秒粘ったか」は難易度調整の一次情報になるので必ず送る。
 */
export function now(): number {
  return typeof performance !== "undefined" ? performance.now() : 0;
}

export function since(startedAt: number): number {
  return Math.round(now() - startedAt);
}
