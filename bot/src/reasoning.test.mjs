/**
 * Leaked reasoning must never reach the group. The caught cases below are
 * real output this model produced during testing.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeReasoning } from '../dist/reasoning.js';

test('catches the model narrating its plan', () => {
  for (const text of [
    'We need to answer the question: "what does today\'s reading mean for us?" The passage is a prophecy against Babylon.',
    'The user wants a plain answer, two or three sentences, no headings.',
    'The instruction says never moralise or preach at people.',
    'We must avoid moralising here, so instead we say...',
    'Okay, so we should explain who the Chaldeans were.',
    '<think>Let me consider the historical setting.</think> The Chaldeans ruled Babylon.',
  ]) {
    assert.equal(looksLikeReasoning(text), true, `should have been caught: "${text.slice(0, 50)}"`);
  }
});

test('lets real answers through', () => {
  for (const text of [
    'The "daughter of the Chaldeans" is a poetic way of speaking about Babylon itself, since the Chaldeans ruled the empire.',
    'The Book of Enoch is not in the Catholic canon; it is canonical only in the Ethiopian Orthodox Tewahedo tradition.',
    'I am not sure -- the text does not say which king is meant.',
    'We are told Babylon fell to Persia in 539 BC, which is what this anticipates.',
    'Isaiah is warning the city of its coming downfall.',
  ]) {
    assert.equal(looksLikeReasoning(text), false, `false positive: "${text.slice(0, 50)}"`);
  }
});
