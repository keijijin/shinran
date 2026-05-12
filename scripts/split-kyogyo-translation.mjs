#!/usr/bin/env node
/**
 * 全文現代語訳（チャンクが --- で連結）を、corpus の教行信証セクション長に比例して分割し
 * content/translations.json の kyogyo / <sectionId> に書き込む。
 *
 *   node scripts/split-kyogyo-translation.mjs --input out/教行証-現代語訳.txt
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = path.join(ROOT, "content", "corpus.json");
const OUT_JSON = path.join(ROOT, "content", "translations.json");

function parseTranslationFile(text) {
  const lines = text.split(/\r?\n/);
  const meta = {};
  let i = 0;
  while (i < lines.length && lines[i].startsWith("#")) {
    const line = lines[i].replace(/^#\s*/, "");
    const m = line.match(/^([^:]+):\s*(.+)$/);
    if (m) meta[m[1]] = m[2].trim();
    i++;
  }
  while (i < lines.length && lines[i].trim() === "") i++;
  const body = lines.slice(i).join("\n").trim();
  return { meta, body };
}

/** nChunks を weights 比で 9 区分に割り当て（合計 nChunks、各 1 以上） */
function allocateChunkCounts(nChunks, weights) {
  const n = weights.length;
  if (nChunks < n) {
    throw new Error(`チャンク数 ${nChunks} が区分数 ${n} 未満です。`);
  }
  const total = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (nChunks * w) / total);
  const counts = raw.map((r) => Math.max(1, Math.floor(r)));
  let sum = counts.reduce((a, b) => a + b, 0);
  if (sum > nChunks) {
    while (sum > nChunks) {
      let j = 0;
      for (let i = 1; i < n; i++) {
        if (counts[i] > 1 && counts[i] >= counts[j]) j = i;
      }
      if (counts[j] <= 1) break;
      counts[j]--;
      sum--;
    }
  } else if (sum < nChunks) {
    const frac = raw.map((r, i) => ({ i, f: r - Math.floor(r) }));
    frac.sort((a, b) => b.f - a.f);
    let k = 0;
    while (sum < nChunks) {
      counts[frac[k % n].i]++;
      k++;
      sum++;
    }
  }
  return counts;
}

function main() {
  const idx = process.argv.indexOf("--input");
  const input =
    idx >= 0 ? process.argv[idx + 1] : path.join(ROOT, "out", "教行証-現代語訳.txt");
  const abs = path.isAbsolute(input) ? input : path.join(ROOT, input);
  if (!fs.existsSync(abs)) {
    console.error(`入力がありません: ${abs}`);
    process.exit(1);
  }

  const corpus = JSON.parse(fs.readFileSync(CORPUS, "utf8"));
  const work = corpus.works.find((w) => w.id === "kyogyo");
  if (!work) {
    console.error("corpus に kyogyo がありません。npm run ingest を実行してください。");
    process.exit(1);
  }

  const raw = fs.readFileSync(abs, "utf8");
  const { meta, body } = parseTranslationFile(raw);
  const chunks = body
    .split(/\n\n---\n\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  const weights = work.sections.map((s) =>
    Math.max(1, s.paragraphs.join("\n\n").length),
  );
  const counts = allocateChunkCounts(chunks.length, weights);

  let root = {};
  if (fs.existsSync(OUT_JSON)) {
    root = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
  }
  root.kyogyo = {};

  let ci = 0;
  const sharedMeta = {
    provider: meta.provider,
    model: meta.model,
    generated_at: meta.generated_at,
    prompt_version: meta.prompt_version,
    source: path.relative(ROOT, abs),
  };

  for (let si = 0; si < work.sections.length; si++) {
    const sec = work.sections[si];
    const take = counts[si];
    const piece = chunks.slice(ci, ci + take).join("\n\n");
    ci += take;
    root.kyogyo[sec.id] = {
      body: piece,
      meta: { ...sharedMeta, section: sec.title },
    };
  }
  if (ci !== chunks.length) {
    console.error(`警告: チャンク割当ずれ ci=${ci} len=${chunks.length}`);
  }

  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, JSON.stringify(root, null, 2), "utf8");
  console.error(
    `Wrote kyogyo (${work.sections.length} sections) from ${chunks.length} chunks → ${OUT_JSON}`,
  );
}

main();
