import { ReaderTabs } from "@/components/ReaderTabs";
import { getSection } from "@/lib/corpus";
import { getTranslation } from "@/lib/translations";
import { notFound } from "next/navigation";
import styles from "../../../page.module.css";

export default function TannishoRyuzaikirokuPage() {
  const section = getSection("tannisho", "ryuzaikiroku");
  if (!section) notFound();
  const tr = getTranslation("tannisho", "ryuzaikiroku");

  return (
    <article>
      <h1 className={styles.h1}>歎異抄 — {section.title}</h1>
      <ReaderTabs paragraphs={section.paragraphs} translation={tr} />
    </article>
  );
}
