#!/usr/bin/env node
/**
 * doc/*.txt をパースし content/corpus.json を生成する。
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import iconv from "iconv-lite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DOC = path.join(ROOT, "doc");
const OUT = path.join(ROOT, "content", "corpus.json");

const KYOGYO_MARKER_TO_ID = {
  総序: "sosho",
  教文類一: "kyo-bunrui-1",
  行文類二: "gyo-bunrui-2",
  "信文類三（本）": "shin-bunrui-3-hon",
  "信文類三（末）": "shin-bunrui-3-matsu",
  証文類四: "sho-bunrui-4",
  真仏土文類五: "shin-butsudo-bunrui-5",
  "化身土文類六（本）": "keshin-butsudo-bunrui-6-hon",
  "化身土文類六（末）": "keshin-butsudo-bunrui-6-matsu",
};

const Z2H = {
  "０": "0",
  "１": "1",
  "２": "2",
  "３": "3",
  "４": "4",
  "５": "5",
  "６": "6",
  "７": "7",
  "８": "8",
  "９": "9",
};

function zenkakuDigitsToInt(s) {
  if (!s) return NaN;
  const t = [...s].map((c) => Z2H[c] ?? c).join("");
  return /^\d+$/.test(t) ? parseInt(t, 10) : NaN;
}

function stripPageLines(text) {
  return text
    .split(/\r?\n/)
    .filter((l) => !/^P--/.test(l))
    .join("\n");
}

function readShiftJis(rel) {
  const buf = fs.readFileSync(path.join(DOC, rel));
  return iconv.decode(buf, "Shift_JIS");
}

/**
 * @param {string} text
 * @param {{ workId: string, title: string, slug: string, mapMarker?: (m: string) => { id: string, title: string } | null }} opts
 */
function parseByHashSections(text, opts) {
  const lines = stripPageLines(text).split(/\r?\n/);
  /** @type {{ id: string, title: string, sourceMarker: string, lines: string[] }[]} */
  const sections = [];
  let current = null;

  const flush = () => {
    if (!current) return;
    const body = current.lines.join("\n").trim();
    sections.push({
      id: current.id,
      title: current.title,
      sourceMarker: current.sourceMarker,
      paragraphs: body ? body.split(/\n{2,}/).map((p) => p.trim()) : [],
    });
    current = null;
  };

  for (const line of lines) {
    const m1 = line.match(/^#1(.+)/);
    const m2 = line.match(/^#2(.+)/);
    if (m2) {
      flush();
      const marker = m2[1].trim();
      const mapped = opts.mapMarker
        ? opts.mapMarker(marker)
        : { id: marker, title: marker };
      if (!mapped) continue;
      current = {
        id: mapped.id,
        title: mapped.title,
        sourceMarker: `#2${marker}`,
        lines: [],
      };
    } else if (m1) {
      const tag = m1[1].trim();
      if (!current && sections.length === 0) {
        continue;
      }
      if (current && (tag.includes("歎異抄") || tag.length < 20)) {
        current.lines.push(line);
      }
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();

  return {
    id: opts.workId,
    title: opts.title,
    slug: opts.slug,
    sections,
  };
}

function mapTannishoMarker(marker) {
  if (marker === "序") return { id: "preface", title: "序" };
  if (marker === "後序") return { id: "kosho", title: "後序" };
  if (marker === "流罪記録") return { id: "ryuzaikiroku", title: "流罪記録" };
  if (/^[０-９]+$/.test(marker)) {
    const n = zenkakuDigitsToInt(marker);
    if (n >= 1 && n <= 99) return { id: String(n), title: `第${n}条` };
  }
  return { id: marker.replace(/\s+/g, "-"), title: marker };
}

function mapKyogyoMarker(marker) {
  const id = KYOGYO_MARKER_TO_ID[marker];
  if (!id) return { id: marker.replace(/\s+/g, "-"), title: marker };
  return { id, title: marker };
}

function parseOverview(text) {
  const body = stripPageLines(text)
    .split(/\r?\n/)
    .filter((l) => !/^#1/.test(l))
    .join("\n")
    .trim();
  return {
    id: "kyogyo-overview",
    title: "教行信証大意",
    slug: "kyogyo-overview",
    sections: [
      {
        id: "document",
        title: "全文",
        sourceMarker: "#1",
        paragraphs: body ? body.split(/\n{2,}/).map((p) => p.trim()) : [],
      },
    ],
  };
}

function main() {
  const tannishoRaw = readShiftJis("19 歎異抄Ｇ.txt");
  const kyogyoRaw = readShiftJis("04 教行証Ｇ.txt");
  const overviewRaw = readShiftJis("23 教行意Ｇ.txt");

  const tannisho = parseByHashSections(tannishoRaw, {
    workId: "tannisho",
    title: "歎異抄",
    slug: "tannisho",
    mapMarker: mapTannishoMarker,
  });

  const kyogyo = parseByHashSections(kyogyoRaw, {
    workId: "kyogyo",
    title: "顕浄土真実教行証文類",
    slug: "kyogyo",
    mapMarker: mapKyogyoMarker,
  });

  const overview = parseOverview(overviewRaw);

  const corpus = {
    generatedAt: new Date().toISOString(),
    works: [overview, kyogyo, tannisho],
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(corpus, null, 2), "utf8");
  console.error(`Wrote ${OUT} (${corpus.works.length} works, sections: ${corpus.works.map((w) => w.sections.length).join(", ")})`);
}

main();
