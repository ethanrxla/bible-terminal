/**
 * When the bot speaks, and -- far more important -- when it does not.
 * Seven people are talking to each other; a false positive here is the bot
 * interrupting a family conversation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { triggerFor, SpeakingLimit } from '../dist/trigger.js';

const plain = (text) => triggerFor({ text, addressedDirectly: false });

test('stays quiet through ordinary family chat', () => {
  for (const text of [
    'good morning everyone',
    'are we still on for dinner?',
    'what time is the game?',
    'lol',
    'can someone pick up milk?',
    'happy birthday!!',
    'is grandma coming tomorrow?',
    'I love you all',
    'praying for you today',
    'amen 🙏',
    'see you at church',
    'who is driving?',
  ]) {
    assert.equal(plain(text), null, `should have stayed quiet: "${text}"`);
  }
});

test('answers when addressed by name', () => {
  assert.equal(plain('bible bot what does this mean'), 'addressed');
  assert.equal(plain('Bible Bot?'), 'addressed');
  assert.equal(plain('biblebot help'), 'addressed');
});

test('answers when quoted or @-mentioned, whatever the words', () => {
  assert.equal(triggerFor({ text: 'thoughts', addressedDirectly: true }), 'addressed');
  assert.equal(triggerFor({ text: 'ok', addressedDirectly: true }), 'addressed');
});

test('answers scripture questions', () => {
  for (const text of [
    'what does Isaiah 47 mean here?',
    'why is this passage about Babylon?',
    'who wrote Hebrews?',
    'what is the Ge’ez word there?',
    'is Enoch in the Catholic canon?',
    'what does this verse mean?',
    "what's today's reading about?",
  ]) {
    assert.equal(plain(text), 'scripture-question', `should have answered: "${text}"`);
  }
});

test('a scripture word without a question is not a summons', () => {
  assert.equal(plain('that verse hit hard today'), null);
  assert.equal(plain('good passage'), null);
});

test('a question about something else is not a summons', () => {
  assert.equal(plain('what time is dinner?'), null);
  assert.equal(plain('did you see the news?'), null);
  // "john" is a book, but also a person -- accepted knowingly: a question
  // mentioning a name that is also a book is rare enough, and answering one
  // is a smaller failure than missing real questions.
  assert.equal(plain('table 5?'), null);
  assert.equal(plain('flight at 2:30?'), null);
});

test('the speaking limit enforces a gap, then an hourly cap', () => {
  const limit = new SpeakingLimit(45_000, 3, 10);
  const t0 = 1_000_000;
  assert.equal(limit.allows(t0).ok, true);
  limit.record(t0);
  assert.equal(limit.allows(t0 + 10_000).ok, false, 'too soon');
  assert.equal(limit.allows(t0 + 46_000).ok, true, 'gap elapsed');
  limit.record(t0 + 46_000);
  limit.record(t0 + 100_000);
  assert.equal(limit.allows(t0 + 200_000).ok, false, 'hourly cap reached');
  // An hour later the window has slid.
  assert.equal(limit.allows(t0 + 3_700_000).ok, true);
});

test('the daily cap is a real backstop', () => {
  const limit = new SpeakingLimit(0, 1000, 5);
  for (let i = 0; i < 5; i += 1) limit.record(1_000_000 + i);
  assert.equal(limit.allows(1_000_100).ok, false);
});

// --- questions about the day's subject ---------------------------------------
// The real miss: someone asked "what is babylon?" about Isaiah 47 and the bot
// said nothing. Babylon is not a book and no keyword list was going to hold
// every place and empire the year's readings touch.
import { topicTerms } from '../dist/trigger.js';

const READING = {
  reference: 'Isaiah 47:5-10',
  text: 'Sit thou silent, and get thee into darkness, O daughter of the Chaldeans: for thou shalt no more be called, The lady of kingdoms. But these two things shall come to thee in a moment in one day, the loss of children, and widowhood.',
  interpretation:
    'The oracle comes from the section called Deutero-Isaiah, dated to the sixth century BCE during the Babylonian exile. It addresses Babylon, the Neo-Babylonian empire centred at Nineveh and later overthrown by Cyrus of Persia.',
};
const topics = topicTerms(READING.reference, READING.text, READING.interpretation);
const about = (text) => triggerFor({ text, addressedDirectly: false, topics });

test('topicTerms picks proper nouns, not ordinary words', () => {
  for (const want of ['babylon', 'chaldeans', 'isaiah', 'nineveh', 'cyrus', 'persia']) {
    assert.ok(topics.has(want), `expected topic: ${want}`);
  }
  // These appear in the text but are ordinary words, so they must not become
  // topics -- otherwise family chat about children would summon the bot.
  for (const reject of ['children', 'darkness', 'silent', 'things', 'lady']) {
    assert.ok(!topics.has(reject), `should not be a topic: ${reject}`);
  }
});

test('answers a question about the day’s subject', () => {
  assert.equal(about('what is babylon?'), 'scripture-question');
  assert.equal(about('who were the Chaldeans?'), 'scripture-question');
  assert.equal(about('why does Cyrus matter here?'), 'scripture-question');
});

test('still ignores family chat, even sharing words with the reading', () => {
  for (const text of [
    'are the children coming tomorrow?',
    'what time is dinner?',
    'can you grab milk?',
    'is it still raining?',
    'who is driving tonight?',
    'did the lady next door call?',
  ]) {
    assert.equal(about(text), null, `should have stayed quiet: "${text}"`);
  }
});

test('a topic word without a question is still not a summons', () => {
  assert.equal(about('babylon was something else'), null);
});
