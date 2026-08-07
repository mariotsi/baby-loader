import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageInDays,
  ageLabel,
  formatBirthDatetime,
  formatLength,
  formatLongDate,
  formatWeight,
} from './birthDisplay.ts';
import { mapBirthDoc } from './birthRecord.ts';

test('ageInDays counts whole calendar days', () => {
  const birth = new Date(2026, 8, 12, 23, 30).toISOString();
  assert.equal(ageInDays(birth, new Date(2026, 8, 12, 23, 59)), 0);
  // Only 90 minutes later, but a new calendar day: she is one day old.
  assert.equal(ageInDays(birth, new Date(2026, 8, 13, 1, 0)), 1);
  assert.equal(ageInDays(birth, new Date(2026, 8, 24, 8, 0)), 12);
});

test('ageInDays never goes negative on a skewed clock', () => {
  const birth = new Date(2026, 8, 12, 4, 0).toISOString();
  assert.equal(ageInDays(birth, new Date(2026, 8, 10)), 0);
});

test('ageInDays returns null for an unparsable date', () => {
  assert.equal(ageInDays('non una data'), null);
});

test('ageLabel drops the count so the big number can render separately', () => {
  assert.equal(ageLabel(0, 'it'), 'oggi');
  assert.equal(ageLabel(1, 'it'), 'giorno di vita');
  assert.equal(ageLabel(9, 'it'), 'giorni di vita');
  assert.equal(ageLabel(0, 'en'), 'today');
  assert.equal(ageLabel(1, 'en'), 'day old');
  assert.equal(ageLabel(9, 'en'), 'days old');
});

test('formatBirthDatetime renders a long date in both languages', () => {
  const iso = new Date(2026, 8, 12, 4, 35).toISOString();
  assert.equal(formatBirthDatetime(iso, 'it'), '12 settembre 2026 alle 04:35');
  assert.equal(formatBirthDatetime(iso, 'en'), '12 September 2026 at 04:35');
});

test('formatBirthDatetime degrades instead of throwing', () => {
  assert.equal(formatBirthDatetime('non una data', 'it'), '—');
  assert.equal(formatBirthDatetime('non una data', 'en'), '—');
});

test('formatLongDate renders the due date without a time', () => {
  const date = new Date(2026, 8, 12);
  assert.equal(formatLongDate(date, 'it'), '12 settembre 2026');
  assert.equal(formatLongDate(date, 'en'), '12 September 2026');
});

test('formatWeight and formatLength follow the language decimals', () => {
  assert.equal(formatWeight(3.25, 'it'), '3,25 kg');
  assert.equal(formatWeight(3.25, 'en'), '3.25 kg');
  assert.equal(formatLength(50, 'it'), '50 cm');
  assert.equal(formatLength(50, 'en'), '50 cm');
  assert.equal(formatWeight(0, 'it'), '—');
  assert.equal(formatLength(Number.NaN, 'en'), '—');
});

test('mapBirthDoc normalizes a mongo document', () => {
  const birthDatetime = new Date(2026, 8, 12, 4, 35);
  const record = mapBirthDoc({
    babyName: '  Emma  ',
    weight: 3.25,
    lengthCm: 50,
    birthMessage: '  Benvenuta  ',
    birthDatetime,
  });
  assert.deepEqual(record, {
    babyName: 'Emma',
    weight: 3.25,
    lengthCm: 50,
    birthMessage: 'Benvenuta',
    birthMessageEn: '',
    birthDatetime: birthDatetime.toISOString(),
  });
});

test('mapBirthDoc rejects unusable documents', () => {
  assert.equal(mapBirthDoc(null), null);
  assert.equal(mapBirthDoc({ babyName: '   ', birthDatetime: new Date() }), null);
  assert.equal(mapBirthDoc({ babyName: 'Emma', birthDatetime: 'non una data' }), null);
});

test('mapBirthDoc accepts an ISO string date and missing measurements', () => {
  const record = mapBirthDoc({ babyName: 'Emma', birthDatetime: '2026-09-12T02:35:00.000Z' });
  assert.equal(record?.birthDatetime, '2026-09-12T02:35:00.000Z');
  assert.equal(record?.weight, 0);
  assert.equal(record?.birthMessage, '');
});
