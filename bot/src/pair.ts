/**
 * Pairing only: connect, report, exit.
 *
 * Deliberately separate from index.ts. Pairing used to mean running the whole
 * bot, which started the scheduler and the catch-up check as a side effect --
 * so an interactive pairing session left open alongside the service meant two
 * schedules, two sends, and two Baileys sessions writing the same auth
 * directory. Nothing here can send a message.
 */

import { connect } from './whatsapp.js';

console.log('Pairing. This will not send anything.\n');

const connection = connect((message) => console.log(message));
await connection.ready();

console.log('\nPaired and connected. Credentials are saved in AUTH_DIR.');
console.log('Next: `bible-bot-groups` to find the group JID.');
process.exit(0);
