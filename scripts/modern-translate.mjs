#!/usr/bin/env node
/**
 * 文献テキストの現代語訳 CLI
 *
 * 用法:
 *   npm run translate -- --input "doc/23 教行意Ｇ.txt"
 *   npm run translate -- --input "doc/04 教行証Ｇ.txt" --encoding shift_jis -o out/kyogyo-mod.txt
 *   npm run translate -- --text "原文をここに"
 *
 * 環境変数: .env（プロジェクトルート）
 *   ANTHROPIC_API_KEY, ANTHROPIC_MODEL
 *   OPENAI_API_KEY, OPENAI_MODEL
 *   TRANSLATION_PROVIDER=anthropic | openai（省略時は anthropic）
 *   TRANSLATE_FALLBACK_PROVIDER=openai | anthropic（主が失敗したときに切替。任意）
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import https from "node:https";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import iconv from "iconv-lite";
import Anthropic, {
  APIConnectionError as AnthropicAPIConnectionError,
} from "@anthropic-ai/sdk";
import OpenAI, {
  APIConnectionError as OpenAIAPIConnectionError,
} from "openai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(ROOT, ".env") });

const PROMPT_VERSION = "1";

const SYSTEM_PROMPT = `あなたは日本の仏教文献（親鸞系の古典・漢文まじりの和文を含む）を、現代の読者に読みやすい日本語へ翻案する助手です。

厳守すること:
- 文献にない事実・教義の断定・出典の捏造はしない。
- 読み取りに迷う箇所は、短い訳注（括弧内）で「解釈が分かれる」「文字が不分明」などと明示してよい。
- 仏教用語は初出または重要箇所で、必要に応じて原語や漢字表記を括弧で残す。過度な口語化は避ける。
- 出力は翻案文のみ。前置きや「以下に訳します」等のメタ文は書かない。`;

function usage() {
  console.error(`用法:
  node scripts/modern-translate.mjs --input <ファイル> [オプション]
  node scripts/modern-translate.mjs --text "..." [オプション]

オプション:
  -o, --output <ファイル>   出力先（省略時は標準出力）
  --encoding utf8|shift_jis  入力の文字コード（既定: utf8）
  --provider anthropic|openai  API 選択（省略時は TRANSLATION_PROVIDER または anthropic）
  --fallback-provider openai|anthropic  主が接続等で失敗したときに切替（以降のチャンクも同じ）。環境変数 TRANSLATE_FALLBACK_PROVIDER でも可
  --max-chars <数>           1 リクエストあたりの最大文字数（行バッファ合算、既定: 12000）
  --delay-ms <数>            チャンク間の待機ミリ秒（既定: 0）
  --cache-dir <ディレクトリ>  指定時、チャンク単位でキャッシュ（同一原文の再実行を省略）
  --strip-page-lines         P-- で始まる行を送る前に除去する
  --retries <数>             接続失敗時の最大試行回数（既定: 5）
  --retry-delay-ms <数>     接続リトライの基準待機 ms（試行回数に比例して増加、既定: 5000）
  --timeout-ms <数>         1 リクエストの最大待機 ms（既定: 環境変数または 1200000=20分）
  --verbose                  失敗時に原因（cause）を標準エラーへ詳細表示

環境変数（任意）:
  ANTHROPIC_BASE_URL         既定は https://api.anthropic.com
  HTTPS_PROXY / HTTP_PROXY   Node が参照するプロキシ
  ANTHROPIC_MAX_RETRIES      SDK 内部リトライ（未設定時は 5）
  OPENAI_MAX_RETRIES         OpenAI 利用時の SDK 内部リトライ（未設定時は 5）
  ANTHROPIC_TIMEOUT_MS       リクエスト全体のタイムアウト（ms）。read ETIMEDOUT 対策で 1200000 以上を推奨
  OPENAI_TIMEOUT_MS          同上（OpenAI 利用時）
  ANTHROPIC_HTTP_DISABLE_KEEPALIVE=1  Keep-Alive を切る（不安定な回線・中間装置向け）
  OPENAI_HTTP_DISABLE_KEEPALIVE=1      同上
  TRANSLATE_FALLBACK_PROVIDER=openai   主が anthropic のとき接続失敗で OpenAI へ（--fallback-provider と同効）
`);
}

function parseArgs(argv) {
  const out = {
    input: null,
    text: null,
    output: null,
    encoding: "utf8",
    provider: process.env.TRANSLATION_PROVIDER || "anthropic",
    maxChars: 12000,
    delayMs: 0,
    cacheDir: null,
    stripPageLines: false,
    retries: 5,
    retryDelayMs: 5000,
    timeoutMs: null,
    fallbackProvider: null,
    verbose: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "-h" || a === "--help") out.help = true;
    else if (a === "--input") out.input = argv[++i];
    else if (a === "--text") out.text = argv[++i];
    else if (a === "-o" || a === "--output") out.output = argv[++i];
    else if (a === "--encoding") out.encoding = argv[++i];
    else if (a === "--provider") out.provider = argv[++i];
    else if (a === "--max-chars") out.maxChars = parseInt(argv[++i], 10);
    else if (a === "--delay-ms") out.delayMs = parseInt(argv[++i], 10);
    else if (a === "--cache-dir") out.cacheDir = argv[++i];
    else if (a === "--strip-page-lines") out.stripPageLines = true;
    else if (a === "--retries") out.retries = parseInt(argv[++i], 10);
    else if (a === "--retry-delay-ms") out.retryDelayMs = parseInt(argv[++i], 10);
    else if (a === "--timeout-ms") out.timeoutMs = parseInt(argv[++i], 10);
    else if (a === "--fallback-provider") out.fallbackProvider = argv[++i];
    else if (a === "--verbose") out.verbose = true;
  }
  const fb =
    out.fallbackProvider || process.env.TRANSLATE_FALLBACK_PROVIDER || null;
  out.fallbackProvider =
    fb && String(fb).toLowerCase() !== "none" && String(fb).trim() !== ""
      ? String(fb).toLowerCase()
      : null;
  out.provider = String(out.provider || "anthropic").toLowerCase();
  return out;
}

function readInputFile(filePath, encoding) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
  const buf = fs.readFileSync(abs);
  if (encoding === "shift_jis" || encoding === "sjis") {
    return iconv.decode(buf, "Shift_JIS");
  }
  return buf.toString("utf8");
}

function stripPageMarkers(text) {
  return text
    .split(/\r?\n/)
    .filter((line) => !/^P--/.test(line))
    .join("\n");
}

/** 1 リクエスト全体のタイムアウト（ms）。read ETIMEDOUT 対策で SDK 既定より長めに取れる */
function resolveTimeoutMs(cliTimeoutMs, provider) {
  if (cliTimeoutMs != null) {
    const c = parseInt(String(cliTimeoutMs), 10);
    if (Number.isFinite(c) && c >= 60_000) return c;
  }
  const env =
    provider === "anthropic"
      ? process.env.ANTHROPIC_TIMEOUT_MS
      : process.env.OPENAI_TIMEOUT_MS;
  const e = parseInt(env || "", 10);
  if (Number.isFinite(e) && e >= 60_000) return e;
  return 1_200_000;
}

function resolveRetryDelayMs(args) {
  const r = parseInt(String(args.retryDelayMs), 10);
  return Number.isFinite(r) && r >= 500 ? r : 5000;
}

function optionalHttpsAgent(disableKeepAlive, socketTimeoutMs) {
  if (!disableKeepAlive) return undefined;
  return new https.Agent({
    keepAlive: false,
    timeout: socketTimeoutMs + 60_000,
  });
}

/** @returns {"anthropic"|"openai"|null} */
function normalizeFallbackProvider(primary, fallback) {
  if (!fallback) return null;
  const p = String(primary).toLowerCase();
  const f = String(fallback).toLowerCase();
  if (f !== "anthropic" && f !== "openai") return null;
  if (f === p) return null;
  return f;
}

/**
 * @returns {{ client: Anthropic | OpenAI, model: string, provider: string }}
 */
function createLlmClient(provider, timeoutMs) {
  const p = String(provider).toLowerCase();
  if (p === "anthropic") {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY が未設定です。");
    }
    const model = process.env.ANTHROPIC_MODEL || "";
    if (!model) throw new Error("ANTHROPIC_MODEL を .env に設定してください。");
    const sdkRetries = Math.max(
      0,
      parseInt(process.env.ANTHROPIC_MAX_RETRIES || "5", 10) || 0,
    );
    const disableKa = process.env.ANTHROPIC_HTTP_DISABLE_KEEPALIVE === "1";
    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: sdkRetries,
      timeout: timeoutMs,
      httpAgent: optionalHttpsAgent(disableKa, timeoutMs),
    });
    return { client, model, provider: "anthropic" };
  }
  if (p === "openai") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY が未設定です。");
    }
    const model = process.env.OPENAI_MODEL || "";
    if (!model) throw new Error("OPENAI_MODEL を .env に設定してください。");
    const sdkRetries = Math.max(
      0,
      parseInt(process.env.OPENAI_MAX_RETRIES || "5", 10) || 0,
    );
    const disableKa = process.env.OPENAI_HTTP_DISABLE_KEEPALIVE === "1";
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: sdkRetries,
      timeout: timeoutMs,
      httpAgent: optionalHttpsAgent(disableKa, timeoutMs),
    });
    return { client, model, provider: "openai" };
  }
  throw new Error(`不明な provider: ${provider}`);
}

function splitLongLine(line, maxChars) {
  if (line.length <= maxChars) return [line];
  const parts = [];
  for (let i = 0; i < line.length; i += maxChars) {
    parts.push(line.slice(i, i + maxChars));
  }
  return parts;
}

/** 行を順に足し、おおよそ maxChars ごとにチャンク化 */
function chunkByLines(text, maxChars) {
  const lines = text.split(/\r?\n/);
  const chunks = [];
  let buf = [];
  let size = 0;
  const flush = () => {
    if (!buf.length) return;
    chunks.push(buf.join("\n"));
    buf = [];
    size = 0;
  };
  for (const line of lines) {
    const pieces = splitLongLine(line, maxChars);
    for (const piece of pieces) {
      const add = piece.length + (buf.length ? 1 : 0);
      if (size + add > maxChars && buf.length) flush();
      buf.push(piece);
      size += add;
    }
  }
  flush();
  return chunks;
}

/** Anthropic の「Connection error.」の奥にある fetch / TLS / DNS の原因を文字列化 */
function formatErrorCause(err, depth = 0) {
  if (!err || depth > 6) return "";
  const parts = [];
  if (err.message) parts.push(err.message);
  if (err.code) parts.push(`code=${err.code}`);
  if (err.errno != null) parts.push(`errno=${err.errno}`);
  if (err.syscall) parts.push(`syscall=${err.syscall}`);
  if (err.address) parts.push(`address=${err.address}`);
  if (err.port) parts.push(`port=${err.port}`);
  const c = err.cause;
  if (c) parts.push(`cause: ${formatErrorCause(c, depth + 1)}`);
  return parts.filter(Boolean).join(" | ");
}

function logConnectionTroubleshooting(provider) {
  const host =
    provider === "openai" ? "api.openai.com" : "api.anthropic.com";
  console.error(`
接続に失敗しました（ネットワーク層）。次を確認してください:
  · インターネット接続、VPN の有無
  · 社内プロキシ: 環境変数 HTTPS_PROXY / HTTP_PROXY
  · ファイアウォールが ${host} の HTTPS(443) を許可しているか
  · 証明書検査: NODE_EXTRA_CA_CERTS（社内 CA の場合）
  · read ETIMEDOUT のとき: 待機時間を延ばす（--timeout-ms または ANTHROPIC_TIMEOUT_MS）、
    チャンクを小さく（--max-chars 4000）、Keep-Alive 無効（ANTHROPIC_HTTP_DISABLE_KEEPALIVE=1）、
    リトライ間隔（--retry-delay-ms 10000）、または --provider openai
`);
}

function isRetryableConnectionError(err) {
  return (
    err instanceof AnthropicAPIConnectionError ||
    err instanceof OpenAIAPIConnectionError ||
    err?.name === "APIConnectionError" ||
    err?.name === "APIConnectionTimeoutError"
  );
}

async function withConnectionRetries(
  label,
  provider,
  maxAttempts,
  retryDelayMs,
  verbose,
  fn,
) {
  let last;
  for (let a = 1; a <= maxAttempts; a++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const detail = formatErrorCause(e);
      if (verbose || a === maxAttempts) {
        console.error(
          `[${label}] 試行 ${a}/${maxAttempts} 失敗: ${e?.message || e}${detail ? ` — ${detail}` : ""}`,
        );
      }
      if (!isRetryableConnectionError(e)) throw e;
      if (a < maxAttempts) await sleep(retryDelayMs * a);
    }
  }
  logConnectionTroubleshooting(provider);
  const causeText = formatErrorCause(last);
  if (causeText.includes("ETIMEDOUT")) {
    console.error(`
ETIMEDOUT の追加ヒント:
  · IPv4 優先: NODE_OPTIONS='--dns-result-order=ipv4first' npm run translate -- ...
  · Anthropic が通らない回線では: --fallback-provider openai（要 OPENAI_API_KEY）
`);
  }
  throw last;
}

function cachePath(cacheDir, provider, model, chunkText) {
  const h = crypto
    .createHash("sha256")
    .update(`${PROMPT_VERSION}\0${provider}\0${model}\0${chunkText}`)
    .digest("hex");
  return path.join(cacheDir, `${h}.txt`);
}

async function translateAnthropic(client, chunk) {
  const model = process.env.ANTHROPIC_MODEL;
  if (!model) {
    throw new Error("ANTHROPIC_MODEL を .env に設定してください。");
  }
  const msg = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content:
          "次のテキストを、前述の方針に従って現代語訳（翻案）してください。\n\n---\n\n" +
          chunk +
          "\n\n---",
      },
    ],
  });
  const block = msg.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Anthropic の応答にテキストブロックがありません。");
  }
  return block.text.trim();
}

async function translateOpenAI(client, chunk) {
  const model = process.env.OPENAI_MODEL;
  if (!model) {
    throw new Error("OPENAI_MODEL を .env に設定してください。");
  }
  const res = await client.chat.completions.create({
    model,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content:
          "次のテキストを、前述の方針に従って現代語訳（翻案）してください。\n\n---\n\n" +
          chunk +
          "\n\n---",
      },
    ],
  });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI の応答が空です。");
  return text.trim();
}

async function translateChunk(provider, client, chunk) {
  if (provider === "openai") return translateOpenAI(client, chunk);
  if (provider === "anthropic") return translateAnthropic(client, chunk);
  throw new Error(`不明な --provider: ${provider}（anthropic または openai）`);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    process.exit(0);
  }
  if (!args.input && !args.text) {
    usage();
    process.exit(1);
  }

  let raw =
    args.text != null
      ? String(args.text)
      : readInputFile(args.input, args.encoding);
  if (args.stripPageLines) raw = stripPageMarkers(raw);

  const provider = String(args.provider).toLowerCase();
  const fallbackNorm = normalizeFallbackProvider(
    provider,
    args.fallbackProvider,
  );
  if (fallbackNorm === "openai" && !process.env.OPENAI_API_KEY) {
    console.error(
      "フォールバック openai には OPENAI_API_KEY（および OPENAI_MODEL）が必要です。",
    );
    process.exit(1);
  }
  if (fallbackNorm === "openai" && !process.env.OPENAI_MODEL) {
    console.error("フォールバック openai には OPENAI_MODEL が必要です。");
    process.exit(1);
  }
  if (fallbackNorm === "anthropic" && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      "フォールバック anthropic には ANTHROPIC_API_KEY（および ANTHROPIC_MODEL）が必要です。",
    );
    process.exit(1);
  }
  if (fallbackNorm === "anthropic" && !process.env.ANTHROPIC_MODEL) {
    console.error("フォールバック anthropic には ANTHROPIC_MODEL が必要です。");
    process.exit(1);
  }

  const rawAttempts = parseInt(String(args.retries), 10);
  const maxAttempts =
    Number.isFinite(rawAttempts) && rawAttempts >= 1 ? rawAttempts : 5;
  const retryDelayMs = resolveRetryDelayMs(args);

  const primaryTimeout = resolveTimeoutMs(args.timeoutMs, provider);
  let primaryBundle;
  try {
    primaryBundle = createLlmClient(provider, primaryTimeout);
  } catch (e) {
    console.error(e.message || e);
    process.exit(1);
  }

  let effectiveProvider = primaryBundle.provider;
  let effectiveClient = primaryBundle.client;
  let effectiveModel = primaryBundle.model;
  const primaryProvider = provider;
  const providersUsed = [effectiveProvider];

  const chunks = chunkByLines(raw, args.maxChars);
  if (chunks.length === 0) {
    console.error("入力が空です。");
    process.exit(1);
  }

  console.error(
    `現代語訳: primary=${primaryProvider} effective=${effectiveProvider} model=${effectiveModel || "(未設定)"} chunks=${chunks.length} maxChars=${args.maxChars} timeoutMs(primary)=${primaryTimeout} connectionAttempts=${maxAttempts} retryDelayMs=${retryDelayMs}${fallbackNorm ? ` fallback=${fallbackNorm}` : ""}`,
  );

  if (args.cacheDir) {
    fs.mkdirSync(args.cacheDir, { recursive: true });
  }

  const parts = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    let out;
    const cp =
      args.cacheDir &&
      cachePath(args.cacheDir, effectiveProvider, effectiveModel, chunk);
    if (cp && fs.existsSync(cp)) {
      out = fs.readFileSync(cp, "utf8");
      console.error(
        `  chunk ${i + 1}/${chunks.length}: cache hit (${effectiveProvider})`,
      );
    } else {
      console.error(
        `  chunk ${i + 1}/${chunks.length}: translating (${effectiveProvider})...`,
      );
      try {
        out = await withConnectionRetries(
          `chunk ${i + 1}/${chunks.length}`,
          effectiveProvider,
          maxAttempts,
          retryDelayMs,
          args.verbose,
          () =>
            translateChunk(effectiveProvider, effectiveClient, chunk),
        );
      } catch (e) {
        if (
          fallbackNorm &&
          effectiveProvider === primaryProvider &&
          fallbackNorm !== primaryProvider &&
          isRetryableConnectionError(e)
        ) {
          console.error(
            `[chunk ${i + 1}/${chunks.length}] 主プロバイダ（${primaryProvider}）が失敗したため、フォールバック（${fallbackNorm}）に切り替えます（この実行の残りのチャンクも同じ）。`,
          );
          const fbTimeout = resolveTimeoutMs(args.timeoutMs, fallbackNorm);
          const fbBundle = createLlmClient(fallbackNorm, fbTimeout);
          effectiveProvider = fbBundle.provider;
          effectiveClient = fbBundle.client;
          effectiveModel = fbBundle.model;
          providersUsed.push(effectiveProvider);
          out = await withConnectionRetries(
            `chunk ${i + 1}/${chunks.length}`,
            effectiveProvider,
            maxAttempts,
            retryDelayMs,
            args.verbose,
            () =>
              translateChunk(effectiveProvider, effectiveClient, chunk),
          );
        } else {
          throw e;
        }
      }
      const cpWrite =
        args.cacheDir &&
        cachePath(args.cacheDir, effectiveProvider, effectiveModel, chunk);
      if (cpWrite) fs.writeFileSync(cpWrite, out, "utf8");
    }
    parts.push(out);
    if (args.delayMs > 0 && i < chunks.length - 1) await sleep(args.delayMs);
  }

  const header = `# 現代語訳（自動）\n# provider: ${providersUsed.join(" -> ")}\n# model: ${effectiveModel}\n# prompt_version: ${PROMPT_VERSION}\n# generated_at: ${new Date().toISOString()}\n\n`;
  const body = parts.join("\n\n---\n\n");

  if (args.output) {
    const outAbs = path.isAbsolute(args.output)
      ? args.output
      : path.join(ROOT, args.output);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, header + body, "utf8");
    console.error(`書き出し: ${outAbs}`);
  } else {
    process.stdout.write(header + body);
  }
}

main().catch((e) => {
  const detail = formatErrorCause(e);
  console.error(e.message || e);
  if (detail) console.error(detail);
  process.exit(1);
});
