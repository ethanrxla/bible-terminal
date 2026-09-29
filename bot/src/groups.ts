/**
 * One-off: list the groups this account is in, with their JIDs.
 *
 * Run once with `npm run groups`, copy the right JID into
 * WHATSAPP_GROUP_JID, and never run it again. Matching on the group's name
 * automatically was tempting and is a trap -- two groups get similar names,
 * someone renames one, and scripture lands in the wrong chat.
 */

import { connect } from './whatsapp.js';

const connection = connect((message) => console.log(message));
const socket = await connection.ready();

const groups = await socket.groupFetchAllParticipating();
const rows = Object.values(groups);

if (rows.length === 0) {
  console.log('\nThis account is not in any groups.');
} else {
  console.log(`\n${rows.length} group(s):\n`);
  for (const group of rows) {
    console.log(`  ${group.id}`);
    console.log(`      ${group.subject}  (${group.participants.length} participants)\n`);
  }
  console.log('Copy the id of the family group into WHATSAPP_GROUP_JID.');
}

process.exit(0);
