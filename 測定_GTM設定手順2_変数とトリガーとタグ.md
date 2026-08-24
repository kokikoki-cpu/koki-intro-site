# GTM / GA4 設定手順 ②（短縮版）

コード側は完成して本番稼働中。dataLayerには全イベントが流れています（プレビューで確認済み）。
ここから先はGTM/GA4の画面作業だけ。

**規模: 変数17 + トリガー7 + タグ7 = 31設定。所要 45〜60分。**

---

## ⚠️ 入力する時の注意（最初に読んでください）

この文書の表に出てくる名前は、**英数字とアンダースコアだけ**です。

- 正しい入力: `pages_in_session` → **pages_in_session**
- 間違い: `` `pages_in_session` `` ← バッククォート付き

**引用符・バッククォート・スペースは一切入れないでください。** 混じると
dataLayerのキー名と一致せず、値が空になります（エラーは出ないので気づきにくい）。

この文書では読みやすさのため名前を枠で囲んで書いていますが、**枠の中身だけ**を入力します。

---

## 何を短縮したか（計測は減りません）

イベントは全部で20種類ありますが、**要件①②③④⑥に名指しされている6つだけ個別にタグを作り、
残り14イベントは「まとめタグ」1つで拾います。**

まとめタグは、イベント名の欄に **{{Event}}** を入れます。これは
「dataLayerに来たイベント名をそのままGA4のイベント名として使う」という指定なので、
**14イベント全部がちゃんと別々の名前でGA4に届きます。** 設定が1つで済むだけです。

減るのは「各イベントの細かいパラメータ」だけ。要件で問われている部分は個別タグで
きちんと押さえます。

---

# Part 1. 変数を作る（17個）

GTM左メニュー **「変数」** → 下段「ユーザー定義変数」→「新規」
→ タイプ **「データレイヤーの変数」**
→ 「データレイヤーの変数名」に下の名前を入力（**記号なし**）
→ 「データレイヤーのバージョン」は **バージョン 2**（初期値のまま）
→ 変数の名前は `DLV - 名前` にすると後で探しやすい

| # | 入力する名前 | 使う要件 |
|---|---|---|
| 1 | track_key | ② |
| 2 | label | ② |
| 3 | percent_scrolled | ① |
| 4 | page_path | ① |
| 5 | device_type | ①④ |
| 6 | pages_in_session | ③ |
| 7 | visit_count | ④ |
| 8 | entry_page | ④ |
| 9 | referrer_host | ④ |
| 10 | item_id | ⑥ |
| 11 | item_type | ⑥ |
| 12 | liked | ⑥ |
| 13 | like_count | ⑥（メトリクス用の数値） |
| 14 | share_method | ⑥ |
| 15 | method | まとめ（ゲート突破手段） |
| 16 | elapsed_ms | まとめ（所要時間） |
| 17 | game_id | まとめ（ゲーム種別） |

---

# Part 2. トリガーを作る（7個）

「トリガー」→「新規」→ タイプ **「カスタムイベント」**
→ 「イベント名」に下の名前を入力（**記号なし**）
→ トリガー名は `CE - 名前`

| # | トリガー名 | 入力するイベント名 | 設定 |
|---|---|---|---|
| 1 | CE - scroll_depth | scroll_depth | そのまま |
| 2 | CE - cta_click | cta_click | そのまま |
| 3 | CE - three_pages_viewed | three_pages_viewed | そのまま |
| 4 | CE - session_context | session_context | そのまま |
| 5 | CE - reaction_like | reaction_like | そのまま |
| 6 | CE - reaction_share | reaction_share | そのまま |
| 7 | CE - その他まとめ | ↓下のコードブロック | **正規表現にチェック** |

**7番のイベント名は下の枠の中身をコピペしてください**（これは1行の正規表現です）:

```
^(spa_page_view|gate_cleared|opening_start|opening_skip|game_start|game_clear|game_fail|game_quit|passphrase_unlock_all|memory_unlocked|all_memories_collected|panel_open|warp_navigate|bgm_toggle)$
```

→ そして **「正規表現の一致を使用」にチェックを入れる。**
ここを忘れると1つも発火しません。

---

# Part 3. タグを作る（7個）

「タグ」→「新規」→ タイプ **「Google アナリティクス: GA4 イベント」**
→ **測定ID: G-KH6VZ8B6HY**
→ イベント名とパラメータを下の通りに
→ トリガーを対応する `CE - 〜` に
→ タグ名は `GA4 - 名前`

**パラメータ名は手入力（記号なし）。値の欄は右の ＋（レゴブロックのアイコン）から
Part 1 で作った変数を選びます**（手で打つのではなく選ぶので、こちらは記号の心配なし）。

### 1. GA4 - scroll_depth 【要件①】
- イベント名: scroll_depth / トリガー: CE - scroll_depth

| パラメータ名（入力） | 値（＋から選ぶ） |
|---|---|
| percent_scrolled | DLV - percent_scrolled |
| page_path | DLV - page_path |
| device_type | DLV - device_type |

### 2. GA4 - cta_click 【要件②】
- イベント名: cta_click / トリガー: CE - cta_click

| パラメータ名（入力） | 値（＋から選ぶ） |
|---|---|
| track_key | DLV - track_key |
| label | DLV - label |

### 3. GA4 - three_pages_viewed 【要件③】
- イベント名: three_pages_viewed / トリガー: CE - three_pages_viewed

| パラメータ名（入力） | 値（＋から選ぶ） |
|---|---|
| pages_in_session | DLV - pages_in_session |

### 4. GA4 - session_context 【要件④】
- イベント名: session_context / トリガー: CE - session_context

| パラメータ名（入力） | 値（＋から選ぶ） |
|---|---|
| visit_count | DLV - visit_count |
| entry_page | DLV - entry_page |
| referrer_host | DLV - referrer_host |
| device_type | DLV - device_type |

### 5. GA4 - reaction_like 【要件⑥】
- イベント名: reaction_like / トリガー: CE - reaction_like

| パラメータ名（入力） | 値（＋から選ぶ） |
|---|---|
| item_id | DLV - item_id |
| item_type | DLV - item_type |
| liked | DLV - liked |
| like_count | DLV - like_count |

### 6. GA4 - reaction_share 【要件⑥】
- イベント名: reaction_share / トリガー: CE - reaction_share

| パラメータ名（入力） | 値（＋から選ぶ） |
|---|---|
| share_method | DLV - share_method |
| item_id | DLV - item_id |

### 7. GA4 - その他まとめ
- **イベント名の欄に {{Event}} と入れる** ← ここが要点
  （組み込み変数です。＋ボタンの一覧に Event が出なければ、
  「変数」画面の上段「組み込み変数」→「設定」→ Event にチェック）
- トリガー: CE - その他まとめ

| パラメータ名（入力） | 値（＋から選ぶ） |
|---|---|
| gate_method | DLV - method |
| elapsed_ms | DLV - elapsed_ms |
| game_id | DLV - game_id |
| item_id | DLV - item_id |
| page_path | DLV - page_path |

> 値が無いイベントでは、そのパラメータは自動的に送られません。全部載せて問題ありません。
> パラメータ名だけ gate_method にしています（method はGA4の予約語と紛れやすいため）。

---

# Part 4. プレビュー → 公開

1. 右上 **「プレビュー」** → `https://koki-intro-site.vercel.app/`
2. サイトを触って、右パネルで **Tags Fired** を確認
   - 開いた直後 → GA4 - session_context
   - ボタンを押す → GA4 - cta_click
   - ゲート突破 → GA4 - その他まとめ
   - 3ページ移動 → GA4 - three_pages_viewed
   - いいね → GA4 - reaction_like
   - シェア → GA4 - reaction_share
3. **変数の値も確認できます。** デバッグ画面で該当イベントを選び「Variables」タブを見ると、
   各変数に値が入っているかが分かります。**undefined になっていたら名前の入力ミス**です
4. 問題なければ右上 **「公開」**

---

# Part 5. GA4側の設定

## 5-1. 自分を除外（要件⑦・**最優先**）

本番はもうデータが流れているので、これを先に。

1. 管理 → データストリーム → ストリームを開く → **「タグ設定を行う」**
2. 「すべて表示」→ **「内部トラフィックの定義」** → 作成
   - ルール名 `自分` / traffic_type の値は internal
   - 一致タイプ **「IPアドレスが次で始まる」** / 値 `2400:4050:37c1:9900`
   - もう1つ足して 127.0.0.1 と ::1（ローカル開発分）
3. 管理 → **データ設定 → データフィルタ** → Internal Traffic を開く
4. **状態を「テスト」→「有効」に変更** ← ここを変えないと除外されません

## 5-2. キーイベント（要件③）

管理 → **イベント** → three_pages_viewed の右
→ **「キーイベントとしてマークを付ける」** をON

> 一覧に出るのは1回以上発生した後です。プレビューで3ページ動いてから見てください。

## 5-3. カスタムディメンション（要件④⑥）

管理 → **カスタム定義** → 「カスタムディメンションを作成」（9個）

| ディメンション名 | 範囲 | イベントパラメータ（入力） |
|---|---|---|
| ボタンキー | イベント | track_key |
| スクロール到達率 | イベント | percent_scrolled |
| デバイス種別 | イベント | device_type |
| リアクション対象種別 | イベント | item_type |
| リアクション対象 | イベント | item_id |
| シェア経路 | イベント | share_method |
| ゲート突破手段 | イベント | gate_method |
| 経由元 | イベント | referrer_host |
| **訪問回数** | **ユーザー** | visit_count |

> visit_count だけ範囲を **ユーザー** に。人に紐づく値なので、イベント範囲だと
> 「何回目の訪問の人か」で人を切れなくなります。

## 5-4. カスタムメトリクス（要件⑥）

同じ画面の **「カスタム指標」** タブ → 作成（2個）

| 指標名 | イベントパラメータ（入力） | 単位 |
|---|---|---|
| いいね累計数 | like_count | 標準 |
| ゲート突破所要時間 | elapsed_ms | ミリ秒 |

---

# 終わったら

「GTM公開した」と言ってください。本番のgtm.jsを取得して、タグが実際に
コンテナに入っているか検証します。

そのあと:
- ⑤ Looker Studio ← データが溜まってから（24〜48時間）
- ⑦ UU30集め ← 一番時間がかかる。並行して人に見てもらう

---

## つまずきやすい所

- **名前に記号（バッククォート・引用符）が混じる** → 値が空になる。エラーは出ないので
  プレビューの Variables タブで undefined を探すのが確実
- **正規表現のチェック忘れ**（Part 2の7番）→ まとめタグが1つも発火しない
- **データフィルタが「テスト」のまま** → 自分の操作が除外されない（一番多い見落とし）
- **{{Event}} が一覧に出ない** → 「組み込み変数」の設定で Event を有効にする
- **カスタムディメンションは作る前のデータに適用されない** → 早めに作る
- 通常レポートに出るのは**24〜48時間後**。すぐ見たいときは「リアルタイム」レポート
