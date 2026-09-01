#!/usr/bin/env node
/**
 * Scores a model's Ge'ez -> English translation against a known-good human one.
 *
 * 1 Enoch survives complete only in Ge'ez, and the dataset carries R.H.
 * Charles's 1917 scholarly English alongside it. That makes it a usable ground
 * truth: ask a model to translate the Ge'ez cold, then measure how much of
 * Charles's vocabulary it independently recovers. A model that is really
 * reading the Ge'ez lands around 55-60%; one that is pattern-matching on the
 * reference or inventing scores in the single digits.
 *
 * Use this before trusting any model with scripture -- including kimi-k3 once
 * NVIDIA brings it back.
 *
 *   node scripts/bench-translation.mjs                        # default chain
 *   node scripts/bench-translation.mjs moonshotai/kimi-k3     # specific models
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const DATA = 'https://cdn.jsdelivr.net/gh/LPettay/ethiopian-bible@main/public/data';

/** Chapters with a Charles translation to score against. */
const SAMPLES = [['1En', 1], ['1En', 2]];

const PROFILES = {
  'moonshotai/kimi-k3': { prefix: '', params: { reasoning_effort: 'low' } },
  'nvidia/nemotron-3-ultra-550b-a55b': { prefix: 'detailed thinking off\n\n', params: {} },
  'nvidia/nemotron-3-nano-30b-a3b': { prefix: 'detailed thinking off\n\n', params: {} },
  'openai/gpt-oss-120b': { prefix: '', params: { reasoning_effort: 'low' } },
};

const RULES = `Translate every verse. Do not merge, split, skip, or renumber verses.
Render the sense faithfully in dignified but readable modern English.
Reply with a single JSON object mapping each verse number, as a string, to its English translation. Nothing else.`;

async function loadKey() {
  if (process.env.NVIDIA_API_KEY) return process.env.NVIDIA_API_KEY;
  for (const file of ['.env.local', '.env']) {
    try {
      const text = await fs.readFile(path.join(ROOT, file), 'utf8');
      const m = text.match(/^\s*NVIDIA_API_KEY\s*=\s*(.+)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    } catch { /* try the next file */ }
  }
  throw new Error('NVIDIA_API_KEY not found');
}

function extractJson(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const c = fenced ? fenced[1] : text;
  const s = c.indexOf('{'), e = c.lastIndexOf('}');
  if (s === -1 || e <= s) throw new Error('no JSON object in reply');
  return JSON.parse(c.slice(s, e + 1));
}

/** Content-word overlap, ignoring short function words. */
const contentWords = (s) =>
  new Set(String(s).toLowerCase().replace(/[^a-z\s]/g, ' ').split(/\s+/).filter((w) => w.length > 3));

function overlap(a, b) {
  const A = contentWords(a), B = contentWords(b);
  if (!A.size || !B.size) return 0;
  let hits = 0;
  for (const w of A) if (B.has(w)) hits += 1;
  return hits / Math.max(A.size, B.size);
}

async function scoreModel(key, model) {
  const profile = PROFILES[model] ?? { prefix: '', params: {} };
  const results = [];

  for (const [book, chapter] of SAMPLES) {
    const raw = await (await fetch(`${DATA}/chapters/${book}/${chapter}.json`)).json();
    const verses = raw.verses.filter((v) => v.geez?.trim() && v.translation?.trim());
    if (verses.length === 0) continue;

    const body = verses.map((v) => {
      const t = (v.words ?? []).map((w) => w.t).filter(Boolean).join(' ');
      return t ? `${v.num}. ${v.geez}\n    [${t}]` : `${v.num}. ${v.geez}`;
    }).join('\n');

    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: `${profile.prefix}You are a scholar of Classical Ethiopic (Ge'ez).\n${RULES}` },
          { role: 'user', content: `Book: ${book}\nChapter: ${chapter}\nVerses: ${verses.length}\n\n${body}\n\nReturn JSON: {"1":"..."}` },
        ],
        max_tokens: 8192,
        temperature: 0.2,
        ...profile.params,
      }),
    });

    if (!res.ok) {
      results.push({ book, chapter, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 120)}` });
      continue;
    }

    const data = await res.json();
    let parsed;
    try {
      parsed = extractJson((data.choices[0].message?.content ?? '').trim());
    } catch (error) {
      results.push({ book, chapter, error: error.message });
      continue;
    }

    const returned = verses.filter((v) => String(parsed[String(v.num)] ?? '').trim()).length;
    const score = verses
      .map((v) => overlap(parsed[String(v.num)] ?? '', v.translation))
      .reduce((a, b) => a + b, 0) / verses.length;

    results.push({ book, chapter, returned, total: verses.length, score, sample: parsed['1'] });
  }

  return results;
}

const models = process.argv.slice(2);
const targets = models.length > 0 ? models : Object.keys(PROFILES);
const key = await loadKey();

console.log('Scoring Ge’ez → English against R.H. Charles (1917).\n');

for (const model of targets) {
  console.log(model);
  try {
    for (const r of await scoreModel(key, model)) {
      if (r.error) {
        console.log(`  ${r.book} ${r.chapter}: FAILED — ${r.error}`);
      } else {
        const verdict = r.score >= 0.45 ? 'usable' : 'NOT TRUSTWORTHY';
        console.log(`  ${r.book} ${r.chapter}: ${r.returned}/${r.total} verses, ${(r.score * 100).toFixed(0)}% overlap — ${verdict}`);
        console.log(`      ${String(r.sample ?? '').slice(0, 110)}`);
      }
    }
  } catch (error) {
    console.log(`  ERROR ${error.message}`);
  }
  console.log();
}
