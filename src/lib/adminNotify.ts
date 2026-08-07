import { ObjectId } from 'mongodb';
import { getMongoClient } from './mongodb';
import { webpush, ensureVapid } from './webpush';
import type { DeviceInfo } from './deviceInfo';
import type { GeoLocation } from './geoip';

type NotifyEvent = 'new' | 'removed';

function formatLocationShort(location: GeoLocation | null | undefined): string | null {
  if (!location) {
    return null;
  }
  return [location.city, location.country].filter(Boolean).join(', ') || null;
}

/**
 * Pings the admin's own device (identified by the ADMIN_SUBSCRIPTION_ID env
 * var, a subscriptions._id) whenever a *different* device subscribes or
 * unsubscribes. Never throws: missing config, an expired admin subscription,
 * or a network hiccup here must never break the actual subscriber's
 * subscribe/unsubscribe request.
 */
export async function notifyAdminOfSubscriptionChange(
  event: NotifyEvent,
  target: { id: string; device: DeviceInfo | null | undefined; location: GeoLocation | null | undefined }
): Promise<void> {
  const adminId = process.env.ADMIN_SUBSCRIPTION_ID;
  if (!adminId) {
    return;
  }
  // Don't notify the admin about their own device (re)subscribing/unsubscribing.
  if (adminId === target.id) {
    return;
  }
  if (!ensureVapid()) {
    console.error('[adminNotify] Missing VAPID configuration');
    return;
  }

  let objectId: ObjectId;
  try {
    objectId = new ObjectId(adminId);
  } catch {
    console.error('[adminNotify] ADMIN_SUBSCRIPTION_ID is not a valid ObjectId');
    return;
  }

  try {
    const client = await getMongoClient();
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');

    const adminDoc = await col.findOne({ _id: objectId });
    if (!adminDoc) {
      console.error('[adminNotify] No subscription found for ADMIN_SUBSCRIPTION_ID');
      return;
    }

    const deviceLabel = target.device?.label || 'Dispositivo sconosciuto';
    const locationLabel = formatLocationShort(target.location);

    const title = event === 'new' ? 'Nuovo iscritto 🎉' : 'Iscrizione rimossa';
    const body = [deviceLabel, locationLabel].filter(Boolean).join(' · ');
    // Only "new" links to a highlighted row; the target no longer exists
    // for "removed", so the page just opens normally with nothing highlighted.
    const url = event === 'new' ? `/admin/subscriptions?highlight=${target.id}` : '/admin/subscriptions';

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.png',
      badge: '/icon-72.png',
      url,
      // Unique per event so multiple subscribe/unsubscribe notifications
      // stack instead of replacing each other (unlike the broadcast
      // announcements, which intentionally collapse into one).
      tag: `admin-sub-${event}-${target.id}`,
    });

    await webpush.sendNotification(adminDoc.subscription, payload);
  } catch (err) {
    console.error('[adminNotify] Failed to notify admin', err);
  }
}
