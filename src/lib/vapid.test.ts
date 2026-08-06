import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeVapidKey, VapidKeyError } from './vapid.ts';

// A real base64url-encoded uncompressed P-256 point.
const VALID_KEY =
  'BKUlld-KmjkCQxF4BXsUDJZH7KGXEqtowzfNGlqaRgAWNkssSgbr_E9E-jH6v5e48P5_MkLwFYgVNJxugcCBfAw';

test('decodes a valid key to 65 bytes', () => {
  const bytes = new Uint8Array(decodeVapidKey(VALID_KEY));
  assert.equal(bytes.length, 65);
  assert.equal(bytes[0], 0x04);
});

test('tolerates surrounding quotes and whitespace', () => {
  for (const variant of [` ${VALID_KEY}`, `${VALID_KEY}\n`, `"${VALID_KEY}"`, `'${VALID_KEY}'`]) {
    assert.equal(new Uint8Array(decodeVapidKey(variant)).length, 65);
  }
});

test('names the missing env var instead of failing opaquely', () => {
  for (const empty of [undefined, '', '   ', '""']) {
    assert.throws(() => decodeVapidKey(empty), (err: Error) => {
      assert.ok(err instanceof VapidKeyError);
      assert.match(err.message, /NEXT_PUBLIC_VAPID_PUBLIC_KEY/);
      return true;
    });
  }
});

test('rejects a key of the wrong length', () => {
  assert.throws(() => decodeVapidKey('QUJD'), (err: Error) => {
    assert.ok(err instanceof VapidKeyError);
    assert.match(err.message, /attesi 65 byte, trovati 3/);
    return true;
  });
});

test('rejects a non-base64 value', () => {
  assert.throws(() => decodeVapidKey('non!!!valido###'), (err: Error) => {
    assert.ok(err instanceof VapidKeyError);
    assert.match(err.message, /base64url/);
    return true;
  });
});
