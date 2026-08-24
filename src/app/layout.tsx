import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho_B1 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BgmPlayer from "@/components/BgmPlayer";
import TrackClicks from "@/components/TrackClicks";
import SiteAnalytics from "@/components/SiteAnalytics";

/*
 * 日本語フォントは1書体が数百の分割ファイルに分かれている。
 * `preload` は既定が true で、subsets に指定した分をすべて先読みするため、
 * 放っておくと初期表示だけで 247ファイル・10.5MB を取りにいっていた。
 *
 * `preload: false` にすると、実際に画面に出ている文字に必要な分だけを
 * 後から取りにいくようになる。`display: "swap"` で、その間は端末の
 * 標準フォントで文字が読める（真っ白にならない）。
 * ウェイトも実際に使っている分だけに絞ってある。増やす前に本当に要るか確認すること。
 */
const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  fallback: ["Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", "Meiryo", "sans-serif"],
});

/* 明朝は 800 の1ウェイトだけ読む。日本語フォントは1書体が100前後の分割ファイルに
   なるので、ウェイトを1つ削るとそれだけで読み込みが数百KB減る。
   そのため `font-display` と併用する `font-bold`(700) は全部 `font-extrabold`(800) に
   寄せてある（DESIGN.md の「見出しは800で統一」と同じ方針）。700に戻すなら、
   ここに weight を足し直すこと。 */
const shipporiMinchoB1 = Shippori_Mincho_B1({
  variable: "--font-shippori-mincho-b1",
  subsets: ["latin"],
  weight: ["800"],
  display: "swap",
  preload: false,
  fallback: ["Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "serif"],
});

export const metadata: Metadata = {
  title: "Who am I ?",
  description:
    "清水航樹の自己紹介サイト。行動力・好奇心・体力を軸に、旅・人との出会い・スポーツを紹介します。",
};

/**
 * GTM のコンテナID。
 *
 * 環境変数（`.env.local` / Vercel）を優先し、無ければこの既定値を使う。
 * コンテナIDは**HTMLにそのまま出る公開情報**なので、コードに置いても秘密は漏れない
 * （Vercel CLI が `NEXT_PUBLIC_` 付きの変数をシークレット扱いして登録を拒むため、
 *  デプロイのたびに詰まるより既定値を持たせる方が確実だと判断した）。
 *
 * 注意: これで**ローカル開発でもタグが動く**ようになった。開発中の操作をGA4に混ぜたくないので、
 * GA4側で「内部トラフィックの除外」（localhost / 自分のIP）を必ず設定すること。
 * 要件⑦の「自身を除く」でどうせ必要になる作業なので、そこで一緒にやる。
 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "GTM-WWG4T3ZW";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${shipporiMinchoB1.variable}`}>
      <body className="min-h-screen">
        {GTM_ID && (
          <>
            <Script id="gtm" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
            </Script>
            {/* GTM標準実装のnoscript側。このサイトはReactなのでJS無効では動かず実益は無いが、
                標準の形に揃えておく */}
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
              />
            </noscript>
          </>
        )}
        <TrackClicks />
        <SiteAnalytics />
        <Header />
        <main>{children}</main>
        <Footer />
        <BgmPlayer />
      </body>
    </html>
  );
}
