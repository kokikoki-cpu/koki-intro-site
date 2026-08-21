import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho_B1 } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BgmPlayer from "@/components/BgmPlayer";
import TrackClicks from "@/components/TrackClicks";

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

const shipporiMinchoB1 = Shippori_Mincho_B1({
  variable: "--font-shippori-mincho-b1",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
  preload: false,
  fallback: ["Hiragino Mincho ProN", "Yu Mincho", "YuMincho", "serif"],
});

export const metadata: Metadata = {
  title: "Who am I ?",
  description:
    "清水航樹の自己紹介サイト。行動力・好奇心・体力を軸に、旅・人との出会い・スポーツを紹介します。",
};

/* GTM のコンテナID。`.env.local` に NEXT_PUBLIC_GTM_ID=GTM-XXXXXXX を置くと有効になる。
   未設定なら1行もタグを読み込まない（開発中に本番の計測を汚さないため）。 */
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${shipporiMinchoB1.variable}`}>
      <body className="min-h-screen">
        {GTM_ID && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`}
          </Script>
        )}
        <TrackClicks />
        <Header />
        <main>{children}</main>
        <Footer />
        <BgmPlayer />
      </body>
    </html>
  );
}
