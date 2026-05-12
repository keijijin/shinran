import corpusJson from "../content/corpus.json";

export type Section = {
  id: string;
  title: string;
  sourceMarker: string;
  paragraphs: string[];
};

export type Work = {
  id: string;
  title: string;
  slug: string;
  sections: Section[];
};

export type Corpus = {
  generatedAt: string;
  works: Work[];
};

export const corpus = corpusJson as Corpus;

export function getWork(id: string): Work | undefined {
  return corpus.works.find((w) => w.id === id);
}

export function getSection(
  workId: string,
  sectionId: string,
): Section | undefined {
  return getWork(workId)?.sections.find((s) => s.id === sectionId);
}
