import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { parsePushSubscription } from '@/lib/push';
import { rateLimit } from '@/lib/rateLimit';
import { clientIp } from '@/lib/auth';
import { buildDeviceInfo } from '@/lib/deviceInfo';
import { lookupGeo } from '@/lib/geoip';

const LOCALE_RE = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/i;

export async function POST(req: NextRequest) {
  if (!rateLimit(`subscribe:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { subscription: raw, locale: rawLocale, deviceHints } = await req.json();

    const subscription = parsePushSubscription(raw);
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription non valida' }, { status: 400 });
    }

    const locale =
      typeof rawLocale === 'string' && LOCALE_RE.test(rawLocale) ? rawLocale : null;

    // UA is authoritative (server-read, can't be spoofed via page JS);
    // deviceHints are client-volunteered extras (screen, timezone, etc.),
    // sanitized and size-capped inside buildDeviceInfo.
    const ip = clientIp(req);
    const device = buildDeviceInfo(req.headers.get('user-agent'), deviceHints);
    // Best-effort, city-level only, no browser permission prompt involved.
    const location = await lookupGeo(ip);

    const client = await getMongoClient();
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');

    // Upsert by endpoint to avoid duplicates
    await col.updateOne(
      { 'subscription.endpoint': subscription.endpoint },
      {
        $set: { subscription, locale, device, location, ip, updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[subscribe] Error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!rateLimit(`unsubscribe:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Troppe richieste' }, { status: 429 });
  }

  try {
    const { endpoint, keys } = await req.json();

    // Require the subscription keys as proof of ownership: knowing an endpoint
    // alone must not be enough to unsubscribe someone else's device.
    const subscription = parsePushSubscription({ endpoint, keys });
    if (!subscription) {
      return NextResponse.json({ error: 'Subscription non valida' }, { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db('pushnotify');

    await db.collection('subscriptions').deleteOne({
      'subscription.endpoint': subscription.endpoint,
      'subscription.keys.auth': subscription.keys.auth,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[unsubscribe] Error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
