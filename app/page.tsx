import Link from "next/link";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <article>
      <h1 className={styles.h1}>歎異抄・教行信証 読解</h1>

      <section className={styles.introSection} aria-labelledby="intro-tannisho">
        <h2 id="intro-tannisho">『歎異抄』とは</h2>
        <p>
          『歎異抄』は、鎌倉時代の僧・親鸞の教えを、弟子の唯円がまとめたとされる書です。
        </p>
        <p>
          「歎異」とは、「異なる教えを歎く」という意味です。
          親鸞の没後、教えが次第に変質していく状況の中で、「本来の念仏の教えとは何か」を後世に伝えるために書かれました。
        </p>
        <p>その中心にあるのは、</p>
        <ul className={styles.introList}>
          <li>人は善人だから救われるのではない</li>
          <li>煩悩を抱えたままの人間こそ救いの対象である</li>
          <li>阿弥陀仏の本願に身を任せる</li>
        </ul>
        <p>
          という、徹底して人間存在を見つめる思想です。
        </p>
        <p>特に有名な</p>
        <blockquote className={styles.introBlockquote}>
          「善人なおもて往生をとぐ、いわんや悪人をや」
        </blockquote>
        <p>
          という言葉は、日本思想史上でも極めて深い言葉として知られています。
        </p>
        <p>
          『歎異抄』は単なる宗教書ではなく、「人はなぜ苦しむのか」「善悪とは何か」「救いとは何か」を問い続ける、人間存在の書でもあります。
        </p>
      </section>

      <hr className={styles.introDivider} />

      <section className={styles.introSection} aria-labelledby="intro-kyogyo">
        <h2 id="intro-kyogyo">『教行信証』とは</h2>
        <p>
          『教行信証』は、親鸞が生涯をかけて著した主著であり、浄土真宗の根本聖典です。
        </p>
        <p>
          正式名称は『顕浄土真実教行証文類（けんじょうどしんじつきょうぎょうしょうもんるい）』。
        </p>
        <p>仏教経典や中国・日本の高僧たちの言葉を引用しながら、</p>
        <ul className={styles.introList}>
          <li>真実の教え（教）</li>
          <li>念仏の実践（行）</li>
          <li>阿弥陀仏を信じる心（信）</li>
          <li>さとり（証）</li>
        </ul>
        <p>を体系的に論じています。</p>
        <p>
          『歎異抄』が親鸞思想を平易に伝える「言葉の書」だとすれば、『教行信証』は、膨大な経典研究を通じて浄土真宗の思想体系を築いた「哲学の書」といえます。
        </p>
        <p>特に親鸞は、</p>
        <ul className={styles.introList}>
          <li>自力ではなく他力</li>
          <li>修行による救済ではなく、本願による救済</li>
          <li>人間の限界を見据えた上での救い</li>
        </ul>
        <p>を徹底的に掘り下げ、日本仏教に大きな転換をもたらしました。</p>
      </section>

      <hr className={styles.introDivider} />

      <section className={styles.introSection} aria-labelledby="intro-site">
        <h2 id="intro-site">このサイトについて</h2>
        <p>このサイトでは、歎異抄と教行信証を、</p>
        <ul className={styles.introList}>
          <li>原文</li>
          <li>現代語訳</li>
          <li>思想的背景</li>
          <li>仏教哲学としての意味</li>
          <li>現代社会との関係</li>
        </ul>
        <p>
          という観点から、できるだけわかりやすく読み解いていきます。
        </p>
        <p>
          単なる宗教解説ではなく、「人間とは何か」「生きるとは何か」を考えるための場所となることを願っています。
        </p>
      </section>

      <p className={styles.metaNote}>
        現代語訳はバッチで生成し、<code>content/translations.json</code> に登録されたものだけを表示します（閲覧者の操作で LLM
        を呼び出すことはありません）。データの由来・免責は{" "}
        <Link href="/about/">このサイトについて（データ・免責）</Link> をご覧ください。
      </p>

      <section className={styles.cards} aria-label="主要ページへのリンク">
        <Link href="/teachings/kyogyo/" className={styles.card}>
          <h2>教行信証</h2>
          <p>大意・六巻区分の本文へ。</p>
        </Link>
        <Link href="/tannisho/" className={styles.card}>
          <h2>歎異抄</h2>
          <p>序・各条・流罪記録へ。</p>
        </Link>
        <Link href="/about/" className={styles.card}>
          <h2>データ・免責</h2>
          <p>取り込み方法と免責事項。</p>
        </Link>
      </section>
    </article>
  );
}
