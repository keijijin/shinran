import fs from "node:fs";
import path from "node:path";

export type TranslationMeta = {
  provider?: string;
  model?: string;
  generated_at?: string;
  prompt_version?: string;
};

export type TranslationEntry = {
  body: string;
  meta?: TranslationMeta;
};

/** workId -> sectionId -> 訳 */
export type TranslationsRoot = Record<string, Record<string, TranslationEntry>>;

let cached: TranslationsRoot | null = null;

export function loadTranslations(): TranslationsRoot {
  if (cached) return cached;
  const p = path.join(process.cwd(), "content", "translations.json");
  if (!fs.existsSync(p)) {
    cached = {};
    return cached;
  }
  try {
    cached = JSON.parse(fs.readFileSync(p, "utf8")) as TranslationsRoot;
  } catch {
    cached = {};
  }
  return cached;
}

export function getTranslation(
  workId: string,
  sectionId: string,
): TranslationEntry | null {
  const t = loadTranslations()[workId]?.[sectionId];
  return t?.body ? t : null;
}
