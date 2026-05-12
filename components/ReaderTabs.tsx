"use client";

import { useState } from "react";
import type { TranslationEntry } from "@/lib/translations";
import styles from "./ReaderTabs.module.css";

type View = "original" | "translation" | "split";

type Props = {
  paragraphs: string[];
  translation: TranslationEntry | null;
};

export function ReaderTabs({ paragraphs, translation }: Props) {
  const [view, setView] = useState<View>("original");

  return (
    <div className={styles.wrap}>
      <div
        className={styles.tabs}
        role="tablist"
        aria-label="表示切替"
      >
        <button
          type="button"
          role="tab"
          aria-selected={view === "original"}
          className={view === "original" ? styles.tabActive : styles.tab}
          onClick={() => setView("original")}
        >
          原文
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "translation"}
          className={view === "translation" ? styles.tabActive : styles.tab}
          onClick={() => setView("translation")}
          disabled={!translation}
        >
          現代語訳
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "split"}
          className={view === "split" ? styles.tabActive : styles.tab}
          onClick={() => setView("split")}
          disabled={!translation}
        >
          並列
        </button>
      </div>

      {view === "original" && (
        <article className={styles.prose} aria-label="原文">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </article>
      )}

      {view === "translation" && (
        <article className={styles.prose} aria-label="現代語訳">
          {translation ? (
            <>
              <div className={styles.translationBody}>{translation.body}</div>
              <footer className={styles.meta}>
                {translation.meta?.model && (
                  <span>モデル: {translation.meta.model}</span>
                )}
                {translation.meta?.generated_at && (
                  <span>生成: {translation.meta.generated_at}</span>
                )}
              </footer>
            </>
          ) : (
            <p className={styles.muted}>
              現代語訳は未登録です。バッチで生成した
              <code> content/translations.json </code>
              に取り込んでください。
            </p>
          )}
        </article>
      )}

      {view === "split" && translation && (
        <div className={styles.split} aria-label="原文と現代語訳">
          <div className={styles.col}>
            <h3 className={styles.colTitle}>原文</h3>
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
          <div className={styles.col}>
            <h3 className={styles.colTitle}>現代語訳</h3>
            <div>{translation.body}</div>
            <footer className={styles.meta}>
              {translation.meta?.model && (
                <span>モデル: {translation.meta.model}</span>
              )}
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
