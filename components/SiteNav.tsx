import Link from "next/link";
import { corpus } from "@/lib/corpus";
import styles from "./SiteNav.module.css";

export function SiteNav() {
  const kyogyo = corpus.works.find((w) => w.id === "kyogyo");
  const tannisho = corpus.works.find((w) => w.id === "tannisho");

  return (
    <nav className={styles.nav} aria-label="サイト目次">
      <Link href="/" className={styles.brand} aria-label="トップへ">
        <span className={styles.brandInner}>
          <img
            src="/shinran-logo.png"
            width={40}
            height={40}
            alt=""
            className={styles.brandMark}
            decoding="async"
          />
          <span className={styles.brandText}>歎異抄・教行信証</span>
        </span>
      </Link>
      <ul className={styles.list}>
        <li>
          <Link href="/">トップ</Link>
        </li>
        <li className={styles.group}>
          <span className={styles.groupLabel}>教行信証</span>
          <ul>
            <li>
              <Link href="/teachings/kyogyo/">ハブ</Link>
            </li>
            <li>
              <Link href="/teachings/kyogyo/overview/">教行信証大意</Link>
            </li>
            <li>
              <Link href="/teachings/kyogyo/text/">本文（目次）</Link>
            </li>
            {kyogyo?.sections.map((s) => (
              <li key={s.id} className={styles.nested}>
                <Link href={`/teachings/kyogyo/text/${s.id}/`}>
                  {s.title}
                </Link>
              </li>
            ))}
          </ul>
        </li>
        <li className={styles.group}>
          <span className={styles.groupLabel}>歎異抄</span>
          <ul>
            <li>
              <Link href="/tannisho/">ハブ</Link>
            </li>
            <li>
              <Link href="/tannisho/preface/">序</Link>
            </li>
            {tannisho?.sections
              .filter(
                (s) =>
                  s.id !== "preface" &&
                  s.id !== "ryuzaikiroku" &&
                  /^\d+$/.test(s.id),
              )
              .map((s) => (
                <li key={s.id} className={styles.nested}>
                  <Link href={`/tannisho/section/${s.id}/`}>{s.title}</Link>
                </li>
              ))}
            <li>
              <Link href="/tannisho/section/kosho/">後序</Link>
            </li>
            <li>
              <Link href="/tannisho/appendix/ryuzaikiroku/">流罪記録</Link>
            </li>
          </ul>
        </li>
        <li>
          <Link href="/about/">このサイトについて</Link>
        </li>
      </ul>
      <p className={styles.note}>
        大意・本文は <code>doc/</code> をインジェストしたデータです。
      </p>
    </nav>
  );
}
