import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ageInDays,
  ageLabel,
  formatAge,
  formatBirthDatetime,
  formatLength,
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

test('formatAge handles today, singular and plural', () => {
  assert.equal(formatAge(0), 'nata oggi');
  assert.equal(formatAge(1), '1 giorno di vita');
  assert.equal(formatAge(2), '2 giorni di vita');
});

test('ageLabel drops the count so the big number can render separately', () => {
  assert.equal(ageLabel(0), 'oggi');
  assert.equal(ageLabel(1), 'giorno di vita');
  assert.equal(ageLabel(9), 'giorni di vita');
});

test('formatBirthDatetime renders an italian long date', () => {
  const iso = new Date(2026, 8, 12, 4, 35).toISOString();
  assert.equal(formatBirthDatetime(iso), '12 settembre 2026 alle 04:35');
});

test('formatBirthDatetime degrades instead of throwing', () => {
  assert.equal(formatBirthDatetime('non una data'), '—');
});

test('formatWeight and formatLength use italian decimals', () => {
  assert.equal(formatWeight(3.25), '3,25 kg');
  assert.equal(formatLength(50), '50 cm');
  assert.equal(formatWeight(0), '—');
  assert.equal(formatLength(Number.NaN), '—');
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
