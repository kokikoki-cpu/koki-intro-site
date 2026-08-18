import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho_B1 } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import BgmPlayer from "@/components/BgmPlayer";

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${notoSansJP.variable} ${shipporiMinchoB1.variable}`}>
      <body className="min-h-screen">
        <Header />
        <main>{children}</main>
        <Footer />
        <BgmPlayer />
      </body>
    </html>
  );
}
