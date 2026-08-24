"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { now, track } from "@/lib/track";

/**
 * 計測の土台。①スクロール率 ③3ページ遷移のキーイベント ④GTM変数 をまとめて持つ。
 *
 * なぜ1つにまとめるか: 3つとも「SPAのページ遷移を検知する」ことが共通の前提で、
 * 別々に書くと遷移の数え方が3通りできて必ず食い違う。
 *
 * なぜGTMのトリガーに任せずコードで送るか:
 * このサイトは `WarpLink` が `router.push()` を使うので、ブラウザのページ読み込みは
 * 最初の1回しか起きない。GTMの「ページビュー」トリガーは2ページ目以降で発火せず、
 * 「スクロール距離」トリガーも遷移でリセットされない（前のページの到達率が残る）。
 * ここで自前に送って、GTM側は「カスタムイベントを受けてGA4に流す」だけにする。
 * ＝ GTMを経由する要件は満たしつつ、SPAで壊れない形にする。
 */

/* sessionStorage: タブを閉じるまで。localStorage: 端末に残る */
const KEY_PAGES = "koki-pages-in-session";
const KEY_ENTRY = "koki-entry-page";
const KEY_REFERRER = "koki-referrer-host";
const KEY_THREE_SENT = "koki-three-pages-sent";
const KEY_VISITS = "koki-visit-count";

/** 何ページ見たらキーイベントにするか（要件③） */
const KEY_EVENT_PAGES = 3;

/**
 * スクロール可能量がこれ未満の画面は「スクロールしない画面」として深度を送らない。
 *
 * このサイトはDESIGN.mdの決定事項で「PCではスクロールしなくて済む」ように作られている。
 * ガードを入れないと、収まりきっている画面で 25/50/75/100% が**開いた瞬間に全部発火**して、
 * 「全員が最後まで読んだ」という嘘の数字が並ぶ。分析の役に立たないどころか判断を誤らせる。
 * 送らないことで「PCでは深度が測れない（測る意味がない）」という事実がそのまま残る。
 */
const MIN_SCROLLABLE_PX = 80;

function deviceType(): string {
  if (typeof window === "undefined") return "unknown";
  const w = window.innerWidth;
  if (w < 768) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
}

/** ストレージは(プライベートモード等で)例外を投げることがあるので、必ず包む */
function readStore(store: "session" | "local", key: string): string | null {
  try {
    const s = store === "session" ? window.sessionStorage : window.localStorage;
    return s.getItem(key);
  } catch {
    return null;
  }
}
function writeStore(store: "session" | "local", key: string, value: string): void {
  try {
    const s = store === "session" ? window.sessionStorage : window.localStorage;
    s.setItem(key, value);
  } catch {
    /* 保存できなくても計測は続ける（数字がずれるだけで、壊れはしない） */
  }
}

export default function SiteAnalytics() {
  const pathname = usePathname();
  const sessionSent = useRef(false);
  /**
   * そのページを実際に見ていた時間（ミリ秒）。タブが裏に回っている間は増えない。
   * 滞在時間の節目を送るのにも、スクロール到達時刻を添えるのにも使うので、
   * 両方の effect から読める ref に置く（表示には使わないので state にしない）。
   */
  const visibleMsRef = useRef(0);

  /* ④ セッションの文脈を1回だけ積む。
     GTMは一度dataLayerに積まれた値を保持するので、以降のイベントからも変数として読める */
  useEffect(() => {
    if (sessionSent.current) return;
    sessionSent.current = true;

    /* 訪問回数。GA4にも session_number があるが、要件が「GTM変数で返す」なので自前で持つ */
    const visits = Number(readStore("local", KEY_VISITS) ?? "0") + 1;
    writeStore("local", KEY_VISITS, String(visits));

    /* 経由元とランディングページ。
       SPAでは document.referrer が初回しか当てにならないので、セッションに焼き付ける */
    let referrerHost = readStore("session", KEY_REFERRER);
    let entryPage = readStore("session", KEY_ENTRY);

    if (!referrerHost) {
      referrerHost = "(direct)";
      if (document.referrer) {
        try {
          const host = new URL(document.referrer).hostname;
          /* 自分自身からの遷移は「経由元」ではない */
          if (host && host !== window.location.hostname) referrerHost = host;
        } catch {
          /* 壊れたrefererは無視して (direct) 扱い */
        }
      }
      entryPage = window.location.pathname;
      writeStore("session", KEY_REFERRER, referrerHost);
      writeStore("session", KEY_ENTRY, entryPage);
    }

    track("session_context", {
      visit_count: visits,
      entry_page: entryPage ?? window.location.pathname,
      referrer_host: referrerHost,
      device_type: deviceType(),
    });
  }, []);

  /* ③ ページ遷移を数えて、3ページ目でキーイベントを1回だけ送る */
  useEffect(() => {
    const pages = Number(readStore("session", KEY_PAGES) ?? "0") + 1;
    writeStore("session", KEY_PAGES, String(pages));

    track("spa_page_view", {
      page_path: pathname,
      page_title: document.title,
      pages_in_session: pages,
    });

    /* 同じセッションで何度も送らない（GA4のキーイベント数が水増しになる） */
    if (pages >= KEY_EVENT_PAGES && !readStore("session", KEY_THREE_SENT)) {
      writeStore("session", KEY_THREE_SENT, "1");
      track("three_pages_viewed", { pages_in_session: pages });
    }
  }, [pathname]);

  /* ① 滞在時間。タブが見えている間だけ積算し、節目（15/30/60/120秒）で送る。
        `visibleMs` はスクロール側からも読むので ref に置く（再描画は要らない値）。

        なぜ滞在時間を独立して測るか: このサイトはPCで画面に収まる設計なので
        スクロールが起きず、深度だけでは「読まれたか」が分からない。
        「動かないがずっと見ていた」を捉えられるのは滞在時間だけ。

        タブを裏に回している間を数えない理由: 開いたまま放置されたページが
        「2分間熱心に読まれた」ことになってしまうと、指標として使えなくなる。 */
  useEffect(() => {
    visibleMsRef.current = 0;
    const marks = [15, 30, 60, 120];
    const sent = new Set<number>();
    let last = now();

    const id = window.setInterval(() => {
      const t = now();
      if (document.visibilityState === "visible") {
        visibleMsRef.current += t - last;
      }
      last = t;

      const seconds = visibleMsRef.current / 1000;
      for (const m of marks) {
        if (seconds >= m && !sent.has(m)) {
          sent.add(m);
          track("dwell_time", {
            seconds: m,
            page_path: pathname,
            device_type: deviceType(),
          });
        }
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [pathname]);

  /* ① スクロール到達率。pathname を依存に入れているので、
        SPA遷移のたびに「送った閾値」の記録がまっさらに戻る（前ページの到達率を持ち越さない） */
  useEffect(() => {
    const sent = new Set<number>();
    const thresholds = [25, 50, 75, 100];

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      if (scrollable < MIN_SCROLLABLE_PX) return;

      const pct = (window.scrollY / scrollable) * 100;
      for (const t of thresholds) {
        if (pct >= t - 0.5 && !sent.has(t)) {
          sent.add(t);
          track("scroll_depth", {
            percent_scrolled: t,
            page_path: pathname,
            device_type: deviceType(),
            /* ここが「スクロール率と滞在時間の組み合わせ」。
               25%を3秒で通過したのか60秒かけたのかで、読み方がまったく違う */
            time_on_page_ms: Math.round(visibleMsRef.current),
          });
        }
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    /* 読み込み直後にすでに下にいる場合（リロード後の位置復元）も拾う */
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  return null;
}
