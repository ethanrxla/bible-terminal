/**
 * The 6am-Eastern day boundary, tested against fixed instants.
 *
 * This is the one piece of the daily edition that cannot be checked by looking
 * at it: an offset bug hides for months and then surfaces on a single Sunday
 * in March. The DST cases below are the whole reason this file exists.
 *
 * Imports the real functions from api/hourly.ts -- Node strips the types on
 * the way in, so there is no duplicated copy to drift.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, previousDayKey } from '../api/hourly.ts';

/** EDT is UTC-4, EST is UTC-5. */
const at = (iso) => new Date(iso);

test('rolls over at 6am Eastern, not at midnight', () => {
  // 2026-09-29 is EDT (UTC-4), so 6am ET is 10:00Z.
  assert.equal(dayKey(at('2026-09-29T09:59:00Z')), '2026-09-28', '05:59 ET is still yesterday');
  assert.equal(dayKey(at('2026-09-29T10:00:00Z')), '2026-09-29', '06:00 ET flips the day');
  assert.equal(dayKey(at('2026-09-29T10:01:00Z')), '2026-09-29');
  assert.equal(dayKey(at('2026-09-30T03:00:00Z')), '2026-09-29', '11pm ET is still the same day');
});

test('follows the zone across a standard-time boundary', () => {
  // 2026-12-15 is EST (UTC-5), so 6am ET is 11:00Z -- an hour later in UTC.
  assert.equal(dayKey(at('2026-12-15T10:59:00Z')), '2026-12-14');
  assert.equal(dayKey(at('2026-12-15T11:00:00Z')), '2026-12-15');
});

test('spring forward: no day is skipped', () => {
  // 2027-03-14 02:00 EST -> 03:00 EDT. The trap: at 06:30 EDT that Sunday,
  // `now - 24h` is 05:30 EST Saturday, which is before 6am and so resolves to
  // Friday -- silently skipping Saturday's edition.
  assert.equal(dayKey(at('2027-03-13T11:00:00Z')), '2027-03-13', 'Sat 06:00 EST');
  assert.equal(dayKey(at('2027-03-14T10:30:00Z')), '2027-03-14', 'Sun 06:30 EDT');
  assert.equal(previousDayKey('2027-03-14'), '2027-03-13', 'Saturday is not skipped');
});

test('fall back: no day is repeated', () => {
  // 2026-11-01 02:00 EDT -> 01:00 EST.
  assert.equal(dayKey(at('2026-11-01T09:59:00Z')), '2026-10-31', '04:59 EST');
  assert.equal(dayKey(at('2026-11-01T11:00:00Z')), '2026-11-01', '06:00 EST');
  assert.equal(previousDayKey('2026-11-01'), '2026-10-31');
});

test('previousDayKey steps across month and year ends', () => {
  assert.equal(previousDayKey('2026-03-01'), '2026-02-28');
  assert.equal(previousDayKey('2028-03-01'), '2028-02-29', 'leap year');
  assert.equal(previousDayKey('2027-01-01'), '2026-12-31');
});

test('the key is always a parseable YYYY-MM-DD', () => {
  for (let hour = 0; hour < 24 * 400; hour += 7) {
    const key = dayKey(new Date(Date.UTC(2026, 0, 1) + hour * 3_600_000));
    assert.match(key, /^\d{4}-\d{2}-\d{2}$/);
  }
});
