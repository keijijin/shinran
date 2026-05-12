import Link from "next/link";
import styles from "../page.module.css";

export default function TannishoHubPage() {
  return (
    <article>
      <h1 className={styles.h1}>歎異抄</h1>
      <p className={styles.lead}>
        親鸞の語りを後世に伝えた書。序・各条・後序・流罪記録に分けて表示します。
      </p>
      <ul className={styles.lead}>
        <li>
          <Link href="/tannisho/preface/">序</Link>
        </li>
        <li>
          <Link href="/tannisho/section/1/">第1条</Link> 〜{" "}
          <Link href="/tannisho/section/18/">第18条</Link>
        </li>
        <li>
          <Link href="/tannisho/section/kosho/">後序</Link>
        </li>
        <li>
          <Link href="/tannisho/appendix/ryuzaikiroku/">流罪記録</Link>
        </li>
      </ul>
    </article>
  );
}
