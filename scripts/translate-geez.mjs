#!/usr/bin/env node
/**
 * Offline Ge'ez -> English translation for the canon books that have no
 * public-domain English text (1 & 3 Meqabyan, Sinodos, the Testament of Our
 * Lord, Ethiopic Clement, and a few related works -- 225 chapters in total).
 *
 * Why offline and committed rather than translated in the browser:
 *
 *  - Scripture must not change wording between page loads. A committed file is
 *    deterministic; a live call is not.
 *  - Every rendered translation stays reviewable in git history.
 *  - Readers never spend the account's NVIDIA quota, and never wait on it.
 *
 * Usage:
 *   node scripts/translate-geez.mjs                 # everything still missing
 *   node scripts/translate-geez.mjs --book 3Meq     # one book
 *   node scripts/translate-geez.mjs --limit 3       # first N chapters only
 *   node scripts/translate-geez.mjs --force         # redo existing files
 *   node scripts/translate-geez.mjs --dry-run       # show the plan, call nothing
 *
 * Requires NVIDIA_API_KEY in the environment or in .env / .env.local.
 * This script talks to NVIDIA directly -- it is not a browser, so it needs no
 * proxy and is not bound by the edge function's token ceiling.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src/data/geez-en');
const DATA_BASE =
  'https://cdn.jsdelivr.net/gh/LPettay/ethiopian-bible@main/public/data';
const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

/**
 * Per-model quirks. Both models here are reasoning models, but they suppress
 * their thinking differently: kimi-k3 takes a `reasoning_effort` parameter and
 * returns reasoning in a separate field, while Nemotron reads the literal
 * phrase "detailed thinking off" at the top of the system prompt and will
 * otherwise spill its reasoning into `content` instead of returning JSON.
 */
const MODEL_PROFILES = {
  'nvidia/nemotron-3-ultra-550b-a55b': {
    systemPrefix: 'detailed thinking off\n\n',
    params: {},
  },
  'moonshotai/kimi-k3': {
    systemPrefix: '',
    params: { reasoning_effort: 'low' },
  },
};

/**
 * Default: nemotron-3-ultra.
 *
 * Chosen by benchmark, not by guesswork. Scored against R.H. Charles's
 * independent 1917 translation of 1 Enoch (which the dataset carries, so it
 * works as ground truth), it reached 56% word overlap on two separate
 * chapters and rendered 1 Enoch 1:9 almost identically to Charles. The other
 * models still serving on the free tier either fabricated verses
 * (openai/gpt-oss-120b: 1 of 9 verses, 2% overlap) or could not return JSON.
 *
 * kimi-k3 produced the earlier chapters and is a fine choice too; it was
 * DEGRADED upstream when this default was set. Override with --model.
 */
const DEFAULT_MODEL = 'nvidia/nemotron-3-ultra-550b-a55b';
const MAX_TOKENS = 8192;

/** Stay under the ~40 req/min free tier with room to spare. */
const MIN_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 5;

/**
 * Give up on the whole run after this many chapters fail back to back.
 * When NVIDIA takes a model offline it answers every request with the same
 * error, and grinding through 200 more chapters against a dead endpoint just
 * turns one outage into a wall of noise.
 */
const MAX_CONSECUTIVE_FAILURES = 5;

/** Re-asks when the model returns unparseable output or drops a verse. */
const PARSE_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --- argument parsing --------------------------------------------------------

function parseArgs(argv) {
  const args = {
    book: null,
    limit: Infinity,
    force: false,
    dryRun: false,
    model: DEFAULT_MODEL,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--book') args.book = argv[++i];
    else if (arg === '--limit') args.limit = Number(argv[++i]);
    else if (arg === '--model') args.model = argv[++i];
    else if (arg === '--force') args.force = true;
    else if (arg === '--dry-run') args.dryRun = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!MODEL_PROFILES[args.model]) {
    throw new Error(
      `Unknown model "${args.model}". Known: ${Object.keys(MODEL_PROFILES).join(', ')}`
    );
  }
  return args;
}

// --- env ---------------------------------------------------------------------

async function loadApiKey() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;

  // .env.local wins over .env, matching Vite's own precedence.
  for (const file of ['.env.local', '.env']) {
    try {
      const text = await fs.readFile(path.join(ROOT, file), 'utf8');
      const match = text.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+)$/m);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '');
    } catch {
      // file absent, try the next one
    }
  }

  throw new Error(
    'NVIDIA_API_KEY not found. Set it in the environment or in .env.local'
  );
}

// --- work discovery ----------------------------------------------------------

/**
 * Reads the canon itself rather than a hand-kept list, so the set of books
 * needing translation can never drift from src/data/ethiopianCanon.ts.
 */
async function findTargets(bookFilter) {
  const canon = await import(
    path.join(ROOT, 'src/data/ethiopianCanon.ts')
  );

  const byAbbrev = new Map();
  for (const book of canon.ALL_BOOKS) {
    for (const part of book.parts) {
      if (part.source !== 'jsdelivr' || part.english !== 'none') continue;
      if (bookFilter && part.abbrev !== bookFilter) continue;
      if (!byAbbrev.has(part.abbrev)) {
        byAbbrev.set(part.abbrev, { abbrev: part.abbrev, label: part.label, chapters: part.chapters });
      }
    }
  }

  return [...byAbbrev.values()];
}

// --- NVIDIA ------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a scholar of Classical Ethiopic (Ge'ez) producing a careful English translation of a chapter of Ethiopian Orthodox Tewahedo scripture.

Rules:
- Translate every verse you are given. Do not merge, split, skip, or renumber verses.
- Render the sense faithfully in dignified but readable modern English, in the register of a standard English Bible.
- Do not add commentary, footnotes, verse numbers, or headings inside the translated text.
- If a word or phrase is genuinely unclear, translate it as best you can rather than leaving it out.
- Reply with a single JSON object mapping each verse number, as a string, to its English translation. Nothing else.`;

function buildUserPrompt(label, chapter, verses) {
  const body = verses
    .map((verse) => {
      const translit = (verse.words ?? [])
        .map((word) => word.t)
        .filter(Boolean)
        .join(' ');
      // The transliteration is included because it materially helps with
      // Ethiopic script the model may otherwise read unreliably.
      return translit
        ? `${verse.num}. ${verse.geez}\n    [${translit}]`
        : `${verse.num}. ${verse.geez}`;
    })
    .join('\n');

  return `Book: ${label}\nChapter: ${chapter}\nVerses to translate: ${verses.length}\n\n${body}\n\nReturn JSON: {${verses
    .map((v) => `"${v.num}": "..."`)
    .slice(0, 3)
    .join(', ')}, ...}`;
}

/** Pulls a JSON object out of a reply that may be fenced or prefixed. */
function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;

  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end <= start) {
    throw new Error('No JSON object found in model reply');
  }

  return JSON.parse(candidate.slice(start, end + 1));
}

let lastCallAt = 0;

async function callModel(apiKey, model, messages) {
  const profile = MODEL_PROFILES[model];
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const wait = lastCallAt + MIN_INTERVAL_MS - Date.now();
    if (wait > 0) await sleep(wait);
    lastCallAt = Date.now();

    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        ...profile.params,
      }),
    });

    if (!response.ok) {
      const body = (await response.text()).slice(0, 300);

      // NVIDIA reports a model taken out of service as a 400 "DEGRADED
      // function cannot be invoked", which is transient despite the 4xx.
      const degraded = response.status === 400 && body.includes('DEGRADED');
      const transient =
        response.status === 429 ||
        response.status >= 500 ||
        degraded;

      if (!transient || attempt === MAX_ATTEMPTS) {
        throw new Error(`NVIDIA ${response.status}: ${body}`);
      }

      const retryAfter = Number(response.headers.get('retry-after')) || 0;
      const backoff = retryAfter * 1000 || Math.min(4000 * 2 ** (attempt - 1), 60000);
      const reason = response.status === 429 ? 'rate limited' : `upstream ${response.status}`;
      console.log(`      ${reason}, waiting ${Math.round(backoff / 1000)}s…`);
      await sleep(backoff);
      continue;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const content = choice?.message?.content?.trim();

    if (!content) {
      // A reasoning model that spends its whole budget thinking returns empty
      // content with finish_reason "length"; retrying is the right move.
      console.log(`      empty content (finish=${choice?.finish_reason}), retrying…`);
      continue;
    }

    return content;
  }

  throw new Error(`Gave up after ${MAX_ATTEMPTS} attempts`);
}

// --- per-chapter work --------------------------------------------------------

async function fetchChapter(abbrev, chapter) {
  const response = await fetch(`${DATA_BASE}/chapters/${abbrev}/${chapter}.json`);
  if (!response.ok) {
    throw new Error(`jsDelivr ${response.status} for ${abbrev}/${chapter}`);
  }
  return response.json();
}

async function translateChapter(apiKey, model, target, chapter) {
  const raw = await fetchChapter(target.abbrev, chapter);
  const verses = (raw.verses ?? []).filter((verse) => verse.geez?.trim());

  if (verses.length === 0) {
    return { skipped: 'no Ge’ez text in source' };
  }

  const messages = [
    {
      role: 'system',
      content: MODEL_PROFILES[model].systemPrefix + SYSTEM_PROMPT,
    },
    { role: 'user', content: buildUserPrompt(target.label, chapter, verses) },
  ];

  // Parsing and validation are inside the retry loop, not after it. A reasoning
  // model that spills its thinking into `content` instead of returning JSON,
  // or that drops a verse, has produced a bad sample rather than a permanent
  // failure -- asking again usually works.
  let translations;
  let lastProblem;

  for (let attempt = 1; attempt <= PARSE_ATTEMPTS; attempt += 1) {
    const content = await callModel(apiKey, model, messages);

    try {
      const parsed = extractJson(content);

      const collected = {};
      const missing = [];
      for (const verse of verses) {
        const value = parsed[String(verse.num)];
        if (typeof value === 'string' && value.trim()) {
          collected[String(verse.num)] = value.trim();
        } else {
          missing.push(verse.num);
        }
      }

      // A partial chapter silently missing verses is worse than no file at
      // all, because the gap is invisible in the reader.
      if (missing.length > 0) {
        throw new Error(
          `omitted ${missing.length}/${verses.length} verses (${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''})`
        );
      }

      translations = collected;
      break;
    } catch (error) {
      lastProblem = error.message;
      if (attempt < PARSE_ATTEMPTS) {
        console.log(`      ${lastProblem}, retrying…`);
      }
    }
  }

  if (!translations) {
    throw new Error(`after ${PARSE_ATTEMPTS} attempts: ${lastProblem}`);
  }

  return {
    book: target.abbrev,
    label: target.label,
    chapter,
    model,
    generatedAt: new Date().toISOString(),
    verseCount: verses.length,
    verses: translations,
  };
}

// --- main --------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const targets = await findTargets(args.book);

  if (targets.length === 0) {
    console.error(args.book ? `No untranslated book named "${args.book}"` : 'Nothing to translate');
    process.exit(1);
  }

  const totalChapters = targets.reduce((sum, t) => sum + t.chapters, 0);
  console.log(`model: ${args.model}`);
  console.log(
    `${targets.length} book(s), ${totalChapters} chapters: ${targets.map((t) => `${t.abbrev}(${t.chapters})`).join(' ')}`
  );

  if (args.dryRun) {
    console.log('--dry-run: no requests made');
    return;
  }

  const apiKey = await loadApiKey();
  let written = 0;
  let skipped = 0;
  let failed = 0;
  let done = 0;
  let consecutiveFailures = 0;
  let aborted = false;

  for (const target of targets) {
    const dir = path.join(OUT_DIR, target.abbrev);
    await fs.mkdir(dir, { recursive: true });

    for (let chapter = 1; chapter <= target.chapters; chapter += 1) {
      if (done >= args.limit) break;

      const file = path.join(dir, `${chapter}.json`);
      if (!args.force) {
        try {
          await fs.access(file);
          skipped += 1;
          continue;
        } catch {
          // not yet written, carry on
        }
      }

      done += 1;
      process.stdout.write(`  ${target.abbrev} ${chapter}/${target.chapters} … `);

      try {
        const result = await translateChapter(apiKey, args.model, target, chapter);
        if (result.skipped) {
          console.log(`skipped (${result.skipped})`);
          skipped += 1;
          continue;
        }
        await fs.writeFile(file, JSON.stringify(result, null, 2) + '\n');
        console.log(`${result.verseCount} verses`);
        written += 1;
        consecutiveFailures = 0;
      } catch (error) {
        console.log(`FAILED: ${error.message}`);
        failed += 1;
        consecutiveFailures += 1;

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.error(
            `\nAborting: ${consecutiveFailures} chapters failed in a row. ` +
            `The endpoint is probably down -- check ` +
            `https://build.nvidia.com and re-run to resume where this left off.`
          );
          aborted = true;
          break;
        }
      }
    }
    if (aborted || done >= args.limit) break;
  }

  console.log(`\nwritten ${written} · skipped ${skipped} · failed ${failed}`);
  if (failed > 0 || aborted) process.exitCode = 1;
}

await main();
