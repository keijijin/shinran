import styles from "../page.module.css";

export default function AboutPage() {
  return (
    <article>
      <h1 className={styles.h1}>このサイトについて</h1>
      <section className={styles.lead}>
        <h2 className={styles.h2}>データの由来</h2>
        <p>
          本文はリポジトリ内の <code>doc/</code> テキストを、ビルド前に{" "}
          <code>npm run ingest</code> でパースした <code>content/corpus.json</code>{" "}
          から表示しています。歎異抄・教行信証大意・教行信証本文は主に Shift_JIS 由来のファイルを UTF-8 に変換して取り込んでいます。
        </p>
        <h2 className={styles.h2}>現代語訳</h2>
        <p>
          表示する現代語訳は、API を用いたバッチ（<code>npm run translate</code>
          ）で生成したうえで、<code>content/translations.json</code>{" "}
          に登録されたものに限ります。ブラウザから LLM を直接呼び出すことはありません。
        </p>
        <h2 className={styles.h2}>免責</h2>
        <p>
          底本・校勘は一次資料に依拠しておらず、表示内容の正確性・完全性は保証しません。学術引用には底本をご確認ください。
        </p>
      </section>
    </article>
  );
}
