import Link from "next/link";
import styles from "../../page.module.css";

export default function KyogyoHubPage() {
  return (
    <article>
      <h1 className={styles.h1}>教行信証</h1>
      <p className={styles.lead}>
        浄土真宗の根本聖典である『顕浄土真実教行証文類』と、その全体を示す『教行信証大意』への入口です。
      </p>
      <ul className={styles.lead}>
        <li>
          <Link href="/teachings/kyogyo/overview/">教行信証大意（全文）</Link>
        </li>
        <li>
          <Link href="/teachings/kyogyo/text/">教行信証本文（巻・区分ごと）</Link>
        </li>
      </ul>
    </article>
  );
}
