import type { Metadata } from "next";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: {
    default: "歎異抄・教行信証 読解",
    template: "%s | 歎異抄・教行信証 読解",
  },
  description:
    "歎異抄・教行信証大意・顕浄土真実教行証文類の閲覧と、事前生成の現代語訳の表示。",
  appleWebApp: {
    title: "歎異抄・教行信証 読解",
  },
};

export const viewport = {
  themeColor: "#5c4a2e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>
        <div className={styles.shell}>
          <aside className={styles.sidebar}>
            <SiteNav />
          </aside>
          <main className={styles.main} id="main">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
