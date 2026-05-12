#!/usr/bin/env node
/**
 * out/*.txt（translate の出力）からメタ行を除いた本文を
 * content/translations.json の kyogyo-overview / document に書き込む。
 *
 *   node scripts/seed-translation-from-out.mjs --input out/教行意-現代語訳.txt
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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

const input = process.argv[process.argv.indexOf("--input") + 1];
if (!input) {
  console.error("用法: node scripts/seed-translation-from-out.mjs --input out/教行意-現代語訳.txt");
  process.exit(1);
}

const abs = path.isAbsolute(input) ? input : path.join(ROOT, input);
const raw = fs.readFileSync(abs, "utf8");
const { meta, body } = parseTranslationFile(raw);

let root = {};
if (fs.existsSync(OUT_JSON)) {
  root = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
}
root["kyogyo-overview"] = root["kyogyo-overview"] || {};
root["kyogyo-overview"]["document"] = {
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
console.error(`Updated ${OUT_JSON} (kyogyo-overview / document)`);
