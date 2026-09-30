/**
 * Listening to the group.
 *
 * Kept separate from the morning send so the two cannot interfere: the send
 * is a scheduled, idempotent, one-way thing, while this is reactive and
 * rate-limited, and a fault in either should not silence the other.
 */

import type { WASocket, proto } from 'baileys';
import { reply, type ReadingContext, type Turn } from './converse.js';
import { SpeakingLimit, topicTerms, triggerFor } from './trigger.js';

/** How much of the conversation the model is shown. */
const CONTEXT_TURNS = 6;

/**
 * Anything older than this is history, not conversation. Baileys replays
 * messages on reconnect, and without this the bot would wake up and answer
 * questions the family asked hours ago.
 */
const MAX_AGE_MS = 120_000;

function textOf(message: proto.IWebMessageInfo): string {
  const content = message.message;
  if (!content) return '';
  return (
    content.conversation ??
    content.extendedTextMessage?.text ??
    content.imageMessage?.caption ??
    content.videoMessage?.caption ??
    ''
  );
}

export interface ListenDeps {
  groupJid: string;
  /** Resolves the day's reading for context; may return null. */
  reading: () => Promise<ReadingContext | null>;
  log: (message: string) => void;
}

/**
 * Built once and attached to each socket. The rate limit and the recent
 * history live here rather than inside attach(), so a reconnect -- which
 * builds a new socket -- cannot quietly reset how much the bot has already
 * said.
 */
export function createListener({ groupJid, reading, log }: ListenDeps) {
  const limit = new SpeakingLimit();
  const history: Turn[] = [];
  let answering = false;

  return function attach(socket: WASocket): void {
    const selfId = (socket.user?.id ?? '').split(':')[0];

    socket.ev.on('messages.upsert', ({ messages, type }) => {
      // 'notify' is a live message. 'append' is history being synced, which
      // must never be treated as something to answer.
      if (type !== 'notify') return;

      for (const message of messages) {
        void handle(socket, selfId, message).catch((error: Error) =>
          log(`Reply failed: ${error.message}`),
        );
      }
    });
  };

  async function handle(
    socket: WASocket,
    selfId: string,
    message: proto.IWebMessageInfo,
  ): Promise<void> {
    if (message.key.remoteJid !== groupJid) return;
    if (message.key.fromMe) return;

    const text = textOf(message);
    if (!text.trim()) return;

    const ageMs = Date.now() - Number(message.messageTimestamp ?? 0) * 1000;
    if (ageMs > MAX_AGE_MS) return;

    const who = message.pushName ?? 'someone';
    history.push({ who, text });
    while (history.length > CONTEXT_TURNS) history.shift();

    const info = message.message?.extendedTextMessage?.contextInfo;
    const mentioned = (info?.mentionedJid ?? []).some((jid: string) => jid.startsWith(selfId));
    const repliedToBot = Boolean(info?.participant?.startsWith(selfId));

    // Resolved before the trigger check so a question about the day's
    // subject -- "what is Babylon?" -- is recognised as one.
    const context = await reading().catch(() => null);
    const topics = context
      ? topicTerms(context.reference, context.text, context.interpretation)
      : undefined;

    const trigger = triggerFor({
      text,
      addressedDirectly: mentioned || repliedToBot,
      topics,
    });

    if (!trigger) {
      // Logged only for questions: silence on a question is the failure mode
      // worth being able to see afterwards, and it is far too noisy to log
      // every message the bot correctly ignores.
      if (text.includes('?')) log(`Ignored question from ${who}: "${text.slice(0, 70)}"`);
      return;
    }

    // One reply at a time: two questions arriving together should not produce
    // two model calls racing each other into the chat.
    if (answering) return log(`Skipped (${trigger}): already answering.`);

    const allowed = limit.allows();
    if (!allowed.ok) return log(`Skipped (${trigger}): ${allowed.reason}.`);

    answering = true;
    try {
      log(`Answering ${who} (${trigger}).`);
      await socket.sendPresenceUpdate('composing', groupJid);

      const answer = await reply([...history], context);
      if (!answer) return log('Model returned nothing; staying quiet.');

      // Quoting keeps the thread legible when several things are in flight.
      await socket.sendMessage(groupJid, { text: answer }, { quoted: message });
      limit.record();
      log(`Replied (${answer.length} chars).`);
    } finally {
      answering = false;
      await socket.sendPresenceUpdate('paused', groupJid).catch(() => {});
    }
  }
}
