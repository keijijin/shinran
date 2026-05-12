import Link from "next/link";
import { getWork } from "@/lib/corpus";
import { notFound } from "next/navigation";
import styles from "../../../page.module.css";

export default function KyogyoTextIndexPage() {
  const work = getWork("kyogyo");
  if (!work) notFound();

  return (
    <article>
      <h1 className={styles.h1}>顕浄土真実教行証文類 — 目次</h1>
      <p className={styles.lead}>区分ごとに本文を表示します。</p>
      <ol>
        {work.sections.map((s) => (
          <li key={s.id}>
            <Link href={`/teachings/kyogyo/text/${s.id}/`}>{s.title}</Link>
          </li>
        ))}
      </ol>
    </article>
  );
}
