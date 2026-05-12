import { ReaderTabs } from "@/components/ReaderTabs";
import { getSection } from "@/lib/corpus";
import { getTranslation } from "@/lib/translations";
import { notFound } from "next/navigation";
import styles from "../../../page.module.css";

type Props = { params: Promise<{ id: string }> };

export function generateStaticParams() {
  const ids: string[] = [];
  for (let n = 1; n <= 18; n++) ids.push(String(n));
  ids.push("kosho");
  return ids.map((id) => ({ id }));
}

export default async function TannishoSectionPage({ params }: Props) {
  const { id } = await params;
  const section = getSection("tannisho", id);
  if (!section) notFound();
  const tr = getTranslation("tannisho", id);

  return (
    <article>
      <h1 className={styles.h1}>歎異抄 — {section.title}</h1>
      <ReaderTabs paragraphs={section.paragraphs} translation={tr} />
    </article>
  );
}
