import { ReaderTabs } from "@/components/ReaderTabs";
import { getSection, getWork } from "@/lib/corpus";
import { getTranslation } from "@/lib/translations";
import { notFound } from "next/navigation";
import styles from "../../../../page.module.css";

type Props = { params: Promise<{ sectionId: string }> };

export function generateStaticParams() {
  const w = getWork("kyogyo");
  return (w?.sections ?? []).map((s) => ({ sectionId: s.id }));
}

export default async function KyogyoTextSectionPage({ params }: Props) {
  const { sectionId } = await params;
  const section = getSection("kyogyo", sectionId);
  if (!section) notFound();

  const tr = getTranslation("kyogyo", sectionId);

  return (
    <article>
      <h1 className={styles.h1}>{section.title}</h1>
      <p className={styles.lead}>
        <code>{section.sourceMarker}</code>
      </p>
      <ReaderTabs paragraphs={section.paragraphs} translation={tr} />
    </article>
  );
}
