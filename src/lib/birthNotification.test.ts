import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatBirthNotification, parseNumber } from './birthNotification.ts';

test('parseNumber accepts comma and dot decimals', () => {
  assert.equal(parseNumber('3,25'), 3.25);
  assert.equal(parseNumber('3.25'), 3.25);
  assert.equal(parseNumber(3.25), 3.25);
  assert.ok(Number.isNaN(parseNumber('')));
  assert.ok(Number.isNaN(parseNumber(undefined)));
});

test('italian copy uses comma decimals', () => {
  const { title, body } = formatBirthNotification(
    { babyName: 'Emma', weight: 3.25, lengthCm: 50 },
    'it-IT'
  );
  assert.equal(title, 'È nata Emma!');
  assert.equal(body, 'Pesa 3,25 kg ed è lunga 50 cm.');
});

test('english copy uses dot decimals and flags the italian message', () => {
  const { title, body } = formatBirthNotification(
    { babyName: 'Emma', weight: 3.25, lengthCm: 50, birthMessage: 'Tutto bene!' },
    'en-GB'
  );
  assert.equal(title, "It's a girl, Emma!");
  assert.equal(body, 'Weighs 3.25 kg and is 50 cm long. 🇮🇹 Tutto bene!');
});

test('length goes through the same parse+format path as weight', () => {
  const { body } = formatBirthNotification({ weight: '3,25', lengthCm: '50,4' }, 'it-IT');
  assert.equal(body, 'Pesa 3,25 kg ed è lunga 50 cm.');
});

test('missing values degrade gracefully instead of printing NaN', () => {
  const { title, body } = formatBirthNotification({}, 'it-IT');
  assert.equal(title, 'È nata!');
  assert.equal(body, 'Pesa — kg ed è lunga — cm.');
});
