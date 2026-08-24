import ShareButtons from "./ShareButtons";

export default function Footer() {
  return (
    <footer className="border-t border-(--color-white)/10 bg-(--color-space) px-5 py-3.5 text-center text-sm text-(--color-bg-soft)/55 md:px-14">
      <ShareButtons />
      {/* アクセス解析の告知。公開サイトでGA4を使うので一行だけ出しておく */}
      <p className="mt-2.5 text-xs text-(--color-bg-soft)/40">
        このサイトはGoogleアナリティクスを利用してアクセス状況を計測しています
      </p>
      <p className="mt-1.5">&copy; 2026 Koki Shimizu</p>
    </footer>
  );
}
