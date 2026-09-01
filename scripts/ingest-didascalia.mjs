#!/usr/bin/env node
/**
 * Ingests the Ethiopic Didascalia into the canon.
 *
 * Source: J.M. Harden, "The Ethiopic Didascalia" (Translations of Christian
 * Literature, Series IV: Oriental Texts), London: SPCK, 1920. Published 1920,
 * so public domain. Scanned by Cornell University Library and served by the
 * Internet Archive.
 *
 * This is a translation of the Ge'ez text itself -- not of the Greek
 * Apostolic Constitutions it descends from -- which is what makes it the right
 * witness for the Ethiopian canon. It is a human scholarly translation, so
 * unlike the Meqabyan chapters it carries no AI-translation warning.
 *
 *   node scripts/ingest-didascalia.mjs [--dry-run]
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'src/data/texts/Didasc');
const SOURCE =
  'https://archive.org/download/cu31924096083336/cu31924096083336_djvu.txt';

const ROMAN = {
  I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000,
};

function fromRoman(value) {
  let total = 0;
  for (let i = 0; i < value.length; i += 1) {
    const current = ROMAN[value[i]];
    const next = ROMAN[value[i + 1]];
    total += next && next > current ? -current : current;
  }
  return total;
}

/**
 * The OCR carries running heads, page numbers, footnote markers and words
 * broken across line ends. None of that belongs in the text.
 */
function cleanBlock(block) {
  return block
    // Rejoin words hyphenated across a line break.
    .replace(/([A-Za-z])-\s*\n\s*([a-z])/g, '$1$2')
    // Drop bare page numbers and running heads on their own line.
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return true;
      if (/^\d{1,3}$/.test(trimmed)) return false;
      if (/^THE ETHIOPIC DIDASCALIA\.?$/i.test(trimmed)) return false;
      if (/^CHAPTER\s+[IVXLC]+\.?$/i.test(trimmed)) return false;
      return true;
    })
    .join('\n')
    // Footnote reference marks left inline by the OCR.
    .replace(/[¹²³⁰-₟]/g, '')
    .replace(/\s+([.,;:])/g, '$1');
}

/**
 * Harden's edition carries a dense critical apparatus -- manuscript sigla (A,
 * P, E), references to the Apostolic Constitutions (AC), and translator's
 * notes -- printed beneath the text. The OCR flattens those footnotes into the
 * body, often interleaving two columns into nonsense such as
 * "3* The addition of these words ** Tentecost is used for the which are
 * found in AC seems _ season from Easter to Pentecost".
 *
 * None of that is scripture, so it is filtered out on several signals rather
 * than one, since no single signal catches it all.
 */
const SIGLUM_VERB =
  /(?<![A-Za-z])(?:AC|[APE])\.?\s+(?:adds?|omits?|reads?|has|hath|gives?|inserts?|places?|connects?|mistranslates?)\b/;
const APPARATUS = /\bAC\b|\bEth\.|\bLit\.|\bCf\.|\bib\.|\bMS\b|\bLXX\b|unintelligible|corruption of|\bDillmann|\bPlatt|\bp\. \d+/;
const NOTE_START = /^["'*‘’“\-–—]|^\d+[\s*.]|^[a-z]/;

function hyphenDensity(text) {
  return (text.match(/[a-z]- [a-z]/g) ?? []).length / Math.max(1, text.length / 100);
}

function apparatusScore(text) {
  let score = 0;
  if (SIGLUM_VERB.test(text)) score += 3;
  if (APPARATUS.test(text)) score += 1;
  if (NOTE_START.test(text.trim())) score += 1;
  if (hyphenDensity(text) >= 0.5) score += 2;
  // Bare manuscript sigla used as labels, e.g. "P hands." or "So E."
  if ((text.match(/(?<![A-Za-z])[APE](?![A-Za-z.])/g) ?? []).length >= 2) score += 1;
  // A short fragment mentioning the apparatus is almost always a note.
  if (text.length < 260 && APPARATUS.test(text)) score += 2;
  if (!/[.?!"’]$/.test(text.trim())) score += 1;
  return score;
}

/** Paragraphs make the natural verse unit for a church order. */
function toVerses(block) {
  return cleanBlock(block)
    .split(/\n\s*\n+/)
    .map((paragraph) => paragraph.replace(/\s+/g, ' ').trim())
    .filter((paragraph) => paragraph.length > 40)
    // Drop paragraphs that are mostly OCR noise rather than prose.
    .filter((paragraph) => {
      const letters = (paragraph.match(/[A-Za-z]/g) ?? []).length;
      return letters / paragraph.length > 0.7;
    })
    .filter((paragraph) => apparatusScore(paragraph) < 3);
}

const dryRun = process.argv.includes('--dry-run');

console.log('Downloading Harden (1920) from the Internet Archive…');
const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`Archive.org returned ${response.status}`);
const text = await response.text();

const headings = [...text.matchAll(/^\s*CHAPTER\s+([IVXLCivxlc]+)\.?\s*$/gm)];
if (headings.length === 0) throw new Error('No chapter headings found');

/**
 * Numbering comes from document order, not from the OCR'd roman numeral.
 *
 * The scan contains exactly 43 chapter headings, matching the book, but two
 * numerals are misread: chapter X appears as "xX" (which would parse as 20 and
 * collide with the real chapter 20), and chapter XXXI appears as "XXXII",
 * duplicating its successor. Trusting the numerals would silently merge or
 * overwrite chapters; trusting their order does not. Disagreements are
 * reported so a future scan change cannot pass unnoticed.
 */
const chapters = [];
for (let index = 0; index < headings.length; index += 1) {
  const heading = headings[index];
  const start = heading.index + heading[0].length;
  const end = index + 1 < headings.length ? headings[index + 1].index : text.length;
  const number = index + 1;

  const printed = fromRoman(heading[1].toUpperCase());
  if (printed !== number) {
    console.warn(`  note: heading ${index + 1} reads "${heading[1]}" (${printed}); using ${number} from document order.`);
  }

  const verses = toVerses(text.slice(start, end));
  if (verses.length === 0) {
    console.warn(`  warning: chapter ${number} produced no usable paragraphs.`);
    continue;
  }
  chapters.push({ number, verses });
}

if (chapters.length !== 43) {
  console.warn(`  warning: expected 43 chapters, parsed ${chapters.length}.`);
}

const best = new Map(chapters.map((chapter) => [chapter.number, chapter]));

const ordered = [...best.values()].sort((a, b) => a.number - b.number);
const totalVerses = ordered.reduce((sum, c) => sum + c.verses.length, 0);
console.log(`Parsed ${ordered.length} chapters, ${totalVerses} paragraphs.`);
console.log(`  ch1 v1: ${ordered[0]?.verses[0]?.slice(0, 110)}`);
console.log(`  ch${ordered.at(-1)?.number} v1: ${ordered.at(-1)?.verses[0]?.slice(0, 110)}`);

if (dryRun) {
  console.log('--dry-run: nothing written');
  process.exit(0);
}

await fs.mkdir(OUT_DIR, { recursive: true });
for (const chapter of ordered) {
  const payload = {
    book: 'Didasc',
    label: 'Didascalia',
    chapter: chapter.number,
    source: 'J.M. Harden, The Ethiopic Didascalia (SPCK, 1920). Public domain.',
    verses: Object.fromEntries(chapter.verses.map((verse, index) => [String(index + 1), verse])),
  };
  await fs.writeFile(
    path.join(OUT_DIR, `${chapter.number}.json`),
    JSON.stringify(payload, null, 2) + '\n',
  );
}
console.log(`Wrote ${ordered.length} files to src/data/texts/Didasc/`);
