/** Uncompressed P-256 point: 1 prefix byte + 32 bytes X + 32 bytes Y. */
const VAPID_KEY_BYTES = 65;
const UNCOMPRESSED_POINT_PREFIX = 0x04;

export class VapidKeyError extends Error {}

/**
 * Decodes a base64url VAPID public key into the ArrayBuffer expected by
 * `PushManager.subscribe`.
 *
 * Validates eagerly: the browser otherwise reports any malformed value as a
 * generic "The provided applicationServerKey is not valid", which hides the
 * common cause (env var missing, or dev server not restarted after adding it).
 */
export function decodeVapidKey(raw: string | undefined): ArrayBuffer {
  // Tolerate values pasted with surrounding quotes or trailing newlines.
  const normalized = (raw ?? '').trim().replace(/^["']|["']$/g, '').trim();

  if (!normalized) {
    throw new VapidKeyError(
      'Chiave VAPID pubblica mancante. Imposta NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local e riavvia il dev server.'
    );
  }

  const padding = '='.repeat((4 - (normalized.length % 4)) % 4);
  const base64 = (normalized + padding).replace(/-/g, '+').replace(/_/g, '/');

  let binary: string;
  try {
    binary = atob(base64);
  } catch {
    throw new VapidKeyError(
      'Chiave VAPID pubblica non valida: non è una stringa base64url. Rigenerala con `npm run generate-vapid`.'
    );
  }

  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  if (bytes.length !== VAPID_KEY_BYTES || bytes[0] !== UNCOMPRESSED_POINT_PREFIX) {
    throw new VapidKeyError(
      `Chiave VAPID pubblica non valida: attesi ${VAPID_KEY_BYTES} byte, trovati ${bytes.length}. ` +
        'Controlla di aver copiato la chiave pubblica (non quella privata) e rigenerala con `npm run generate-vapid`.'
    );
  }

  return bytes.buffer as ArrayBuffer;
}
