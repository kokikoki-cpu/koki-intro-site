# GTM / GA4 設定手順 ②（変数・トリガー・タグ／全イベント個別版）

コード側は完成して本番に乗っています。dataLayerには全イベントが流れている状態
（プレビューで確認済み）。ここから先はGTM/GA4の画面作業だけです。

**規模**: 変数30個 + トリガー20個 + タグ20個 = **70設定**。
1つ1つは単純な繰り返しですが数が多いので、Part単位で区切って進めてください。
**所要 2〜3時間**（慣れると後半は速くなります）。

> まとめて数個で済ませる作り方もありますが、研修としてイベントごとに
> トリガーとタグを作る形にしています。1対1で並ぶので、後から見て何が何だか分かる
> という利点も実際にあります。

---

# Part 1. 変数を作る（30個）

GTM左メニュー **「変数」** → 下段「ユーザー定義変数」→「新規」
→ 変数タイプ **「データレイヤーの変数」**
→ 「データレイヤーの変数名」に**下の値をそのまま**入れる
→ 変数の名前は `DLV - キー名` にする（例: `DLV - track_key`）

| # | データレイヤーの変数名 | 何が入るか |
|---|---|---|
| 1 | `track_key` | 押されたボタンのキー（`world-pin-turkey` 等） |
| 2 | `label` | ボタンの文字 |
| 3 | `percent_scrolled` | 25 / 50 / 75 / 100 |
| 4 | `page_path` | `/world` などのパス |
| 5 | `page_title` | ページのタイトル |
| 6 | `pages_in_session` | そのセッションで見たページ数 |
| 7 | `visit_count` | 何回目の訪問か |
| 8 | `entry_page` | 最初に着地したページ |
| 9 | `referrer_host` | 経由元のホスト名（`(direct)` の場合あり） |
| 10 | `device_type` | mobile / tablet / desktop |
| 11 | `item_id` | 対象のID（`turkey` `p2` `tennis` 等） |
| 12 | `item_type` | country / person / sport |
| 13 | `item_name` | 対象の名前（日本語） |
| 14 | `liked` | true = 付けた / false = 外した |
| 15 | `like_count` | その人の累計いいね数（**メトリクス用の数値**） |
| 16 | `share_method` | native / x / line / copy |
| 17 | `method` | ゲート突破の手段（game / passphrase） |
| 18 | `elapsed_ms` | 経過ミリ秒 |
| 19 | `game_id` | ゲーム種別（gate / battle / balloon 等） |
| 20 | `level` | 難易度（1〜5） |
| 21 | `duration_ms` | ゲームの所要ミリ秒 |
| 22 | `phase` | 諦めた時点の状態 |
| 23 | `skipped` | オープニングを飛ばしたか |
| 24 | `from` | 合言葉をどこで使ったか |
| 25 | `category` | 記憶の種別（country / person / sport / career） |
| 26 | `collected` | 集めた数 |
| 27 | `total` | 全部の数 |
| 28 | `panel_id` | 開いたパネル |
| 29 | `to` | ロケットの行き先 |
| 30 | `state` | BGMの play / pause |

---

# Part 2. トリガーを作る（20個）

GTM左メニュー **「トリガー」** → 「新規」→ トリガータイプ **「カスタムイベント」**
→ 「イベント名」に下の値を入れる（**正規表現のチェックは不要**）
→ トリガー名は `CE - イベント名` にする

| # | イベント名（入力値） | いつ飛ぶか |
|---|---|---|
| 1 | `session_context` | ページを開いた直後に1回（④の変数を運ぶ） |
| 2 | `spa_page_view` | ページを移動するたび |
| 3 | `scroll_depth` | 25/50/75/100%に到達（①） |
| 4 | `three_pages_viewed` | 3ページ目に着いた瞬間に1回（③） |
| 5 | `cta_click` | `data-track` 付きのボタンを押した（②） |
| 6 | `reaction_like` | いいねを押した/外した（⑥） |
| 7 | `reaction_share` | シェアした（⑥） |
| 8 | `gate_cleared` | ゲートを突破した |
| 9 | `opening_start` | オープニングの「ゲームスタート」 |
| 10 | `opening_skip` | 前口上を飛ばした |
| 11 | `game_start` | ゲームを始めた |
| 12 | `game_clear` | クリアした |
| 13 | `game_fail` | 失敗した |
| 14 | `game_quit` | 諦めて閉じた |
| 15 | `passphrase_unlock_all` | 合言葉で全解錠した |
| 16 | `memory_unlocked` | 記憶を1つ手に入れた |
| 17 | `all_memories_collected` | 全部集めた |
| 18 | `panel_open` | パネルを開いた |
| 19 | `warp_navigate` | ロケットで移動した |
| 20 | `bgm_toggle` | BGMを切り替えた |

---

# Part 3. タグを作る（20個）

GTM左メニュー **「タグ」** → 「新規」→ タグタイプ **「Google アナリティクス: GA4 イベント」**
→ **測定ID**: `G-KH6VZ8B6HY`
→ **イベント名**: 下の表の通り
→ **イベントパラメータ**: 下の表の通り（値の欄は右の **＋** から変数を選ぶ）
→ **トリガー**: 対応する `CE - 〜`
→ タグ名は `GA4 - イベント名`

### 要件に直接かかわる7個（ここは丁寧に）

| タグ名 | イベント名 | パラメータ（名前 = 値） |
|---|---|---|
| `GA4 - scroll_depth` **①** | `scroll_depth` | `percent_scrolled` = `{{DLV - percent_scrolled}}`<br>`page_path` = `{{DLV - page_path}}`<br>`device_type` = `{{DLV - device_type}}` |
| `GA4 - cta_click` **②** | `cta_click` | `track_key` = `{{DLV - track_key}}`<br>`label` = `{{DLV - label}}` |
| `GA4 - three_pages_viewed` **③** | `three_pages_viewed` | `pages_in_session` = `{{DLV - pages_in_session}}` |
| `GA4 - session_context` **④** | `session_context` | `visit_count` = `{{DLV - visit_count}}`<br>`entry_page` = `{{DLV - entry_page}}`<br>`referrer_host` = `{{DLV - referrer_host}}`<br>`device_type` = `{{DLV - device_type}}` |
| `GA4 - reaction_like` **⑥** | `reaction_like` | `item_id` = `{{DLV - item_id}}`<br>`item_type` = `{{DLV - item_type}}`<br>`liked` = `{{DLV - liked}}`<br>`like_count` = `{{DLV - like_count}}` |
| `GA4 - reaction_share` **⑥** | `reaction_share` | `share_method` = `{{DLV - share_method}}`<br>`item_id` = `{{DLV - item_id}}` |
| `GA4 - spa_page_view` | `spa_page_view` | `page_path` = `{{DLV - page_path}}`<br>`page_title` = `{{DLV - page_title}}`<br>`pages_in_session` = `{{DLV - pages_in_session}}` |

### このサイト固有の分析用 13個

| タグ名 | イベント名 | パラメータ（名前 = 値） |
|---|---|---|
| `GA4 - gate_cleared` | `gate_cleared` | `gate_method` = `{{DLV - method}}`<br>`elapsed_ms` = `{{DLV - elapsed_ms}}` |
| `GA4 - opening_start` | `opening_start` | `skipped` = `{{DLV - skipped}}`<br>`elapsed_ms` = `{{DLV - elapsed_ms}}` |
| `GA4 - opening_skip` | `opening_skip` | `elapsed_ms` = `{{DLV - elapsed_ms}}` |
| `GA4 - game_start` | `game_start` | `game_id` = `{{DLV - game_id}}`<br>`item_id` = `{{DLV - item_id}}`<br>`item_name` = `{{DLV - item_name}}`<br>`level` = `{{DLV - level}}` |
| `GA4 - game_clear` | `game_clear` | 上の4つ + `duration_ms` = `{{DLV - duration_ms}}` |
| `GA4 - game_fail` | `game_fail` | 上の4つ + `duration_ms` = `{{DLV - duration_ms}}` |
| `GA4 - game_quit` | `game_quit` | `game_id` / `item_id` / `item_name` + `phase` = `{{DLV - phase}}` |
| `GA4 - passphrase_unlock_all` | `passphrase_unlock_all` | `from` = `{{DLV - from}}` |
| `GA4 - memory_unlocked` | `memory_unlocked` | `item_id` = `{{DLV - item_id}}`<br>`category` = `{{DLV - category}}`<br>`collected` = `{{DLV - collected}}`<br>`total` = `{{DLV - total}}` |
| `GA4 - all_memories_collected` | `all_memories_collected` | `total` = `{{DLV - total}}` |
| `GA4 - panel_open` | `panel_open` | `panel_id` = `{{DLV - panel_id}}` |
| `GA4 - warp_navigate` | `warp_navigate` | `to` = `{{DLV - to}}` |
| `GA4 - bgm_toggle` | `bgm_toggle` | `state` = `{{DLV - state}}` |

> **`method` だけ、送る名前を `gate_method` に変えています。** `method` はGA4側の
> 予約語と紛れやすく、レポートで見分けにくくなるためです。GTM変数名は `DLV - method`
> のままで、タグのパラメータ名だけ変えます。

---

# Part 4. プレビューで確認 → 公開

1. 右上 **「プレビュー」** → `https://koki-intro-site.vercel.app/` を入れる
2. サイトを触りながら、右パネルで **Tags Fired** を確認
   - 開いた直後 → `GA4 - session_context`
   - オープニングを飛ばす → `GA4 - opening_skip`
   - ゲート突破 → `GA4 - gate_cleared` と `GA4 - game_clear`
   - 惑星を押して移動 → `GA4 - cta_click` `GA4 - warp_navigate` `GA4 - spa_page_view`
   - 3ページ目 → `GA4 - three_pages_viewed`
   - モーダルでいいね → `GA4 - reaction_like`
   - Footerでシェア → `GA4 - reaction_share`
3. 問題なければ右上 **「公開」**

**発火しないタグがあったら、そのイベント名をメモして教えてください。** dataLayer側か
タグ側かをこちらで切り分けます。

---

# Part 5. GA4側の設定

## 5-1. 自分を除外する（要件⑦・**最優先**）

もう本番でデータが流れているので、これを先に。

1. GA4 管理 → データストリーム → ストリームを開く → **「タグ設定を行う」**
2. 「すべて表示」→ **「内部トラフィックの定義」** → 作成
   - ルール名: `自分` ／ `traffic_type` の値: `internal`
   - 一致タイプ: **「IPアドレスが次で始まる」** ／ 値: `2400:4050:37c1:9900`
   - もう1つ足して `127.0.0.1` と `::1`（ローカル開発用）
3. 管理 → **データ設定 → データフィルタ**
4. `Internal Traffic` を開き、**状態を「テスト」→「有効」に変更**
   → **ここを変えないと除外されません。** 初期は「テスト」です

> IPv6は変わりやすいので、回線が変わったら値の確認をお願いします。

## 5-2. キーイベント（要件③）

管理 → **イベント** → `three_pages_viewed` の右
→ **「キーイベントとしてマークを付ける」** をON

> 一覧に出るのは実際に1回以上発生した後です。プレビューで3ページ動いてから見てください。

## 5-3. カスタムディメンション（要件④⑥）

管理 → **カスタム定義** → 「カスタムディメンションを作成」

| ディメンション名 | 範囲 | イベントパラメータ |
|---|---|---|
| ボタンキー | イベント | `track_key` |
| スクロール到達率 | イベント | `percent_scrolled` |
| デバイス種別 | イベント | `device_type` |
| リアクション対象種別 | イベント | `item_type` |
| リアクション対象 | イベント | `item_id` |
| シェア経路 | イベント | `share_method` |
| ゲート突破手段 | イベント | `gate_method` |
| 経由元 | イベント | `referrer_host` |
| ランディングページ | イベント | `entry_page` |
| ゲーム種別 | イベント | `game_id` |
| 記憶の種別 | イベント | `category` |
| **訪問回数** | **ユーザー** | `visit_count` |

> `visit_count` だけ範囲を **ユーザー** に。人に紐づく値なので、イベント範囲だと
> 「何回目の訪問の人か」で人を切れなくなります。

## 5-4. カスタムメトリクス（要件⑥）

同じ「カスタム定義」画面の **「カスタム指標」** タブ → 作成

| 指標名 | イベントパラメータ | 単位 |
|---|---|---|
| いいね累計数 | `like_count` | 標準 |
| ゲート突破所要時間 | `elapsed_ms` | ミリ秒 |
| セッション内閲覧ページ数 | `pages_in_session` | 標準 |
| ゲーム所要時間 | `duration_ms` | ミリ秒 |
| 集めた記憶の数 | `collected` | 標準 |

---

# 終わったら

「GTM公開した」と言ってください。本番のgtm.jsを取得して、
**タグが実際にコンテナに入っているか**を検証します。

そのあと:
- ⑤ Looker Studio ← データが溜まってから（24〜48時間）
- ⑦ UU30集め ← 一番時間がかかる。並行して人に見てもらう

---

## つまずきやすい所

- **データフィルタが「テスト」のまま** → 自分の操作が除外されない（一番多い見落とし）
- **カスタムディメンションを作る前のデータには適用されない** → 早めに作る方が良い
- 通常レポートに出るのは**24〜48時間後**。すぐ見たいときは「リアルタイム」レポート
- パラメータ名は**半角小文字とアンダースコアだけ**。全角が混じると無効になります
- タグを作るとき測定IDの入力を忘れやすい（`G-KH6VZ8B6HY`）
