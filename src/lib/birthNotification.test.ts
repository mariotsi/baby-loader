import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatBirthNotification,
  localizedBirthMessage,
  parseNumber,
} from './birthNotification.ts';

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

test('localizedBirthMessage prefers the english text when there is one', () => {
  assert.equal(
    localizedBirthMessage('en', 'Mamma e bimba stanno bene', 'Mum and baby are doing well'),
    'Mum and baby are doing well'
  );
});

test('localizedBirthMessage flags the italian fallback for english readers', () => {
  assert.equal(localizedBirthMessage('en', 'Stanno bene', ''), '\u{1F1EE}\u{1F1F9} Stanno bene');
  assert.equal(localizedBirthMessage('en', 'Stanno bene', undefined), '\u{1F1EE}\u{1F1F9} Stanno bene');
});

test('localizedBirthMessage never shows the english text to italian readers', () => {
  assert.equal(localizedBirthMessage('it', 'Stanno bene', 'They are fine'), 'Stanno bene');
  assert.equal(localizedBirthMessage('it', '', 'They are fine'), '');
});

test('localizedBirthMessage returns an empty string when there is nothing to say', () => {
  assert.equal(localizedBirthMessage('en', '', ''), '');
  assert.equal(localizedBirthMessage('it', '   ', ''), '');
});

test('the english notification uses the english message without the flag', () => {
  const { body } = formatBirthNotification(
    {
      babyName: 'Emma',
      weight: 3.25,
      lengthCm: 50,
      birthMessage: 'Stanno bene',
      birthMessageEn: 'They are doing well',
    },
    'en-US'
  );
  assert.ok(body.endsWith('They are doing well'));
  assert.ok(!body.includes('\u{1F1EE}\u{1F1F9}'));
});
