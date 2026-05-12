#!/usr/bin/env node
/**
 * corpus の指定ワークをセクション単位で modern-translate に渡し、
 * content/translations.json にマージする。
 *
 *   node scripts/batch-translate-corpus.mjs --work kyogyo-overview
 *   node scripts/batch-translate-corpus.mjs --work tannisho --resume
 *
 * --resume … 既に translations.json に body があればそのセクションをスキップ
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS = path.join(ROOT, "content", "corpus.json");
const OUT_JSON = path.join(ROOT, "content", "translations.json");
const TRANSLATE = path.join(ROOT, "scripts", "modern-translate.mjs");
const CACHE = path.join(ROOT, ".cache", "translations");

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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadJson(p, fallback) {
  if (!fs.existsSync(p)) return fallback;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

async function main() {
  const workIdx = process.argv.indexOf("--work");
  const workId = workIdx >= 0 ? process.argv[workIdx + 1] : null;
  const resume = process.argv.includes("--resume");
  const pauseMs = parseInt(
    process.env.BATCH_TRANSLATE_PAUSE_MS || "3000",
    10,
  );

  if (!workId) {
    console.error(
      "用法: node scripts/batch-translate-corpus.mjs --work kyogyo-overview|tannisho [--resume]",
    );
    process.exit(1);
  }

  const corpus = loadJson(CORPUS, { works: [] });
  const work = corpus.works.find((w) => w.id === workId);
  if (!work) {
    console.error(`corpus に work id=${workId} がありません`);
    process.exit(1);
  }

  let root = loadJson(OUT_JSON, {});
  root[workId] = root[workId] || {};

  const srcDir = path.join(ROOT, ".cache", "corpus-src", workId);
  const outDir = path.join(ROOT, ".cache", "corpus-tr-out", workId);
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(CACHE, { recursive: true });

  const sections = work.sections;
  console.error(
    `batch-translate: work=${workId} sections=${sections.length} resume=${resume} pauseMs=${pauseMs}`,
  );

  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const existing = root[workId][sec.id];
    if (
      resume &&
      existing &&
      typeof existing.body === "string" &&
      existing.body.length > 50
    ) {
      console.error(`  [${i + 1}/${sections.length}] skip ${sec.id} (resume)`);
      continue;
    }

    const text = sec.paragraphs.join("\n\n");
    const inFile = path.join(srcDir, `${sec.id}.txt`);
    const outFile = path.join(outDir, `${sec.id}.txt`);
    fs.writeFileSync(inFile, text, "utf8");

    console.error(`  [${i + 1}/${sections.length}] translate ${sec.id} …`);
    const r = spawnSync(
      process.execPath,
      [
        TRANSLATE,
        "--input",
        inFile,
        "-o",
        outFile,
        "--cache-dir",
        CACHE,
      ],
      {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env },
      },
    );
    if (r.status !== 0) {
      console.error(`失敗: section ${sec.id} status=${r.status}`);
      process.exit(r.status ?? 1);
    }

    const translated = fs.readFileSync(outFile, "utf8");
    const { meta, body } = parseTranslationFile(translated);
    root[workId][sec.id] = {
      body,
      meta: {
        provider: meta.provider,
        model: meta.model,
        generated_at: meta.generated_at,
        prompt_version: meta.prompt_version,
      },
    };
    fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
    fs.writeFileSync(OUT_JSON, JSON.stringify(root, null, 2), "utf8");

    if (i < sections.length - 1 && pauseMs > 0) {
      await sleep(pauseMs);
    }
  }

  console.error(`完了 → ${OUT_JSON}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
