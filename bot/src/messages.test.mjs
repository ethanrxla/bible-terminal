/**
 * The chunker is the only place a message can be silently mangled, so it is
 * the only thing here worth a test: everything else is a fetch or a log line.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkOnParagraphs, messagesFor } from '../dist/messages.js';

const LIMIT = 3500;

test('short text is left alone', () => {
  assert.deepEqual(chunkOnParagraphs('one short paragraph'), ['one short paragraph']);
});

test('splits on blank lines, never mid-word', () => {
  const paragraph = 'word '.repeat(400).trim(); // 1999 chars
  const chunks = chunkOnParagraphs([paragraph, paragraph, paragraph].join('\n\n'));
  assert.ok(chunks.length > 1, 'should split');
  for (const chunk of chunks) {
    assert.ok(chunk.length <= LIMIT, `chunk of ${chunk.length} exceeds ${LIMIT}`);
    assert.ok(!/\bwor$|\bwo$/.test(chunk), 'cut a word in half');
  }
  // Nothing may be dropped.
  const joined = chunks.join(' ').replace(/\s+/g, ' ');
  assert.equal(joined.split('word').length - 1, 1200);
});

test('a single over-long paragraph falls back to sentence ends', () => {
  const sentence = 'This is a complete sentence about the passage. ';
  const chunks = chunkOnParagraphs(sentence.repeat(200).trim());
  assert.ok(chunks.length > 1);
  for (const chunk of chunks) {
    assert.ok(chunk.length <= LIMIT);
    // Every chunk should end at a sentence boundary.
    assert.match(chunk.trim(), /[.!?]$/);
  }
});

const base = {
  ready: true,
  slot: 'passage',
  day: '2026-09-29',
  reference: 'Isaiah 47:5-10',
  text: 'Sit thou silent.',
  translation: 'King James Version',
  section: 'protocanonical',
  geezName: null,
  interpretation: 'Paragraph one.\n\nParagraph two.\n\nParagraph three.',
  question: 'What does this ask of us?',
  url: 'https://bible-terminal.vercel.app',
};

test('three messages in the ordinary case', () => {
  const messages = messagesFor(base);
  assert.equal(messages.length, 3);
  assert.match(messages[0], /Isaiah 47:5-10/);
  assert.match(messages[1], /Interpretation/);
  assert.match(messages[2], /For reflection/);
});

test('the question message is dropped, not faked, when absent', () => {
  const messages = messagesFor({ ...base, question: null });
  assert.equal(messages.length, 2);
  assert.ok(!messages.some((m) => /For reflection/.test(m)));
});

test('a long interpretation splits rather than being truncated', () => {
  const long = Array.from({ length: 12 }, (_, i) => `Paragraph ${i}. ${'text '.repeat(120)}`).join('\n\n');
  const messages = messagesFor({ ...base, interpretation: long });
  assert.ok(messages.length > 3, 'interpretation should span more than one message');
  for (const message of messages) assert.ok(message.length <= LIMIT + 200);
  // The final paragraph must survive.
  assert.ok(messages.join('\n').includes('Paragraph 11.'));
});

test('every message fits WhatsApp when the passage is at its longest', () => {
  const messages = messagesFor({ ...base, text: 'verse text. '.repeat(300) });
  for (const message of messages) assert.ok(Buffer.byteLength(message, 'utf8') < 4096);
});

test('SEND_PARTS: scripture only still carries the link through', () => {
  const messages = messagesFor(base, ['scripture']);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /Isaiah 47:5-10/);
  assert.ok(!/Interpretation/.test(messages[0]));
  assert.match(messages[0], /bible-terminal\.vercel\.app/, 'the site link must survive');
});

test('SEND_PARTS: scripture + question omits the long interpretation', () => {
  const messages = messagesFor(base, ['scripture', 'question']);
  assert.equal(messages.length, 2);
  assert.ok(!messages.some((m) => /Interpretation/.test(m)));
  assert.match(messages[1], /For reflection/);
});

test('SEND_PARTS: order is fixed, not caller-controlled', () => {
  const messages = messagesFor(base, ['question', 'scripture']);
  assert.match(messages[0], /Isaiah/, 'passage always leads');
  assert.match(messages[1], /For reflection/);
});

test('SEND_PARTS: an empty selection sends nothing', () => {
  assert.deepEqual(messagesFor(base, []), []);
});

test('a verse day still links to the site', () => {
  // Only the passage slot produces a question, so on the six verse days
  // `question` is selected but absent -- the link must not vanish with it.
  const messages = messagesFor({ ...base, slot: 'verse', question: null }, ['scripture', 'question']);
  assert.equal(messages.length, 1);
  assert.match(messages[0], /bible-terminal\.vercel\.app/);
});

test('the link appears exactly once', () => {
  for (const parts of [['scripture'], ['scripture', 'question'], ['scripture', 'interpretation', 'question']]) {
    for (const question of [base.question, null]) {
      const joined = messagesFor({ ...base, question }, parts).join('\n');
      const count = joined.split('bible-terminal.vercel.app').length - 1;
      assert.equal(count, 1, `parts=${parts} question=${question}: expected 1 link, got ${count}`);
    }
  }
});
