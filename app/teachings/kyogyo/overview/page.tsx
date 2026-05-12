import { ReaderTabs } from "@/components/ReaderTabs";
import { getSection } from "@/lib/corpus";
import { getTranslation } from "@/lib/translations";
import { notFound } from "next/navigation";
import styles from "../../../page.module.css";

export default function KyogyoOverviewPage() {
  const section = getSection("kyogyo-overview", "document");
  if (!section) notFound();

  const tr = getTranslation("kyogyo-overview", section.id);

  return (
    <article>
      <h1 className={styles.h1}>教行信証大意</h1>
      <p className={styles.lead}>
        六巻（教・行・信・証・真仏土・化身土）の教相の骨格を示す文献です。
      </p>
      <ReaderTabs paragraphs={section.paragraphs} translation={tr} />
    </article>
  );
}
