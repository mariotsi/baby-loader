import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLang, negotiateLang } from './i18n.ts';

test('il cookie vince su Accept-Language', () => {
  assert.equal(negotiateLang('en-US,en;q=0.9', 'it'), 'it');
  assert.equal(negotiateLang('it-IT,it;q=0.9', 'en'), 'en');
});

test('un cookie con un valore sconosciuto viene ignorato', () => {
  assert.equal(negotiateLang('en-US,en;q=0.9', 'de'), 'en');
  assert.equal(negotiateLang('en-US,en;q=0.9', ''), 'en');
  assert.equal(negotiateLang('en-US,en;q=0.9', null), 'en');
});

test('legge la lingua primaria ignorando la regione', () => {
  assert.equal(negotiateLang('en-GB'), 'en');
  assert.equal(negotiateLang('it-CH,it'), 'it');
  assert.equal(negotiateLang('EN-us'), 'en');
});

test('rispetta i pesi q anche quando non sono in ordine', () => {
  // Il tedesco ha il peso più alto ma non è supportato: vince l'inglese, che
  // pesa più dell'italiano.
  assert.equal(negotiateLang('de;q=1.0,it;q=0.3,en;q=0.8'), 'en');
  assert.equal(negotiateLang('de;q=1.0,it;q=0.8,en;q=0.3'), 'it');
});

test('a parità di peso vince l ordine di dichiarazione', () => {
  assert.equal(negotiateLang('en,it'), 'en');
  assert.equal(negotiateLang('it,en'), 'it');
});

test('scarta le lingue con peso zero', () => {
  assert.equal(negotiateLang('en;q=0,it;q=0.5'), 'it');
});

test('ricade sull italiano quando non c e nulla di utile', () => {
  assert.equal(negotiateLang(null), 'it');
  assert.equal(negotiateLang(undefined), 'it');
  assert.equal(negotiateLang(''), 'it');
  assert.equal(negotiateLang('*'), 'it');
  assert.equal(negotiateLang('de-DE,fr;q=0.7'), 'it');
  assert.equal(negotiateLang('spazzatura;;;'), 'it');
});

test('isLang restringe il tipo', () => {
  assert.equal(isLang('it'), true);
  assert.equal(isLang('en'), true);
  assert.equal(isLang('IT'), false);
  assert.equal(isLang(undefined), false);
});
