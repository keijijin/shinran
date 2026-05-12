import { ReaderTabs } from "@/components/ReaderTabs";
import { getSection } from "@/lib/corpus";
import { getTranslation } from "@/lib/translations";
import { notFound } from "next/navigation";
import styles from "../../page.module.css";

export default function TannishoPrefacePage() {
  const section = getSection("tannisho", "preface");
  if (!section) notFound();
  const tr = getTranslation("tannisho", "preface");

  return (
    <article>
      <h1 className={styles.h1}>歎異抄 — {section.title}</h1>
      <ReaderTabs paragraphs={section.paragraphs} translation={tr} />
    </article>
  );
}
