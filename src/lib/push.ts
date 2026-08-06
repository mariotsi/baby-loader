import type { PushSubscription } from 'web-push';

// Only these hosts are legitimate Web Push endpoints. Accepting an arbitrary
// endpoint would let anyone use this server as an HTTP proxy (SSRF).
const ALLOWED_ENDPOINT_HOSTS = [
  'android.googleapis.com',
  'fcm.googleapis.com',
  'updates.push.services.mozilla.com',
  'push.services.mozilla.com',
  'notify.windows.com',
  'push.apple.com',
];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_ENDPOINT_HOSTS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );
}

export function parsePushSubscription(input: unknown): PushSubscription | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const { endpoint, keys } = input as { endpoint?: unknown; keys?: unknown };

  if (typeof endpoint !== 'string' || endpoint.length > 1024) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return null;
  }

  if (url.protocol !== 'https:') {
    return null;
  }
  if (!isAllowedHost(url.hostname)) {
    return null;
  }

  if (!keys || typeof keys !== 'object') {
    return null;
  }
  const { p256dh, auth } = keys as { p256dh?: unknown; auth?: unknown };
  if (typeof p256dh !== 'string' || typeof auth !== 'string') {
    return null;
  }
  if (!p256dh || !auth || p256dh.length > 256 || auth.length > 256) {
    return null;
  }

  // Rebuild the object so no extra attacker-controlled fields are persisted.
  return { endpoint: url.toString(), keys: { p256dh, auth } };
}
