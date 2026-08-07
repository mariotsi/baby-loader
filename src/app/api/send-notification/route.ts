import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { getMongoClient } from '@/lib/mongodb';
import { isAuthorized, clientIp } from '@/lib/auth';
import { rateLimit } from '@/lib/rateLimit';
import { formatBirthNotification, parseNumber } from '@/lib/birthNotification';

const VAPID_EMAIL = process.env.VAPID_EMAIL;
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

// Configure lazily: a missing env var must not crash module evaluation, which
// would turn every request to this route into an opaque 500.
let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) {
    return true;
  }
  if (!VAPID_EMAIL || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return false;
  }
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidReady = true;
  return true;
}

function guard(req: NextRequest): NextResponse | null {
  if (!rateLimit(`admin:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: 'Troppi tentativi, riprova tra un minuto' }, { status: 429 });
  }
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  return null;
}

function safeRedirectPath(input: unknown): string {
  if (typeof input !== 'string' || !input.startsWith('/') || input.startsWith('//')) {
    return '/';
  }
  return input;
}

export async function POST(req: NextRequest) {
  const denied = guard(req);
  if (denied) {
    return denied;
  }

  if (!ensureVapid()) {
    console.error('[send-notification] Missing VAPID configuration');
    return NextResponse.json({ error: 'Configurazione VAPID mancante' }, { status: 500 });
  }

  try {
    const data = await req.json();
    const { type = 'generic' } = data;
    const url = safeRedirectPath(data.url);

    let title: string | undefined;
    let bodyText: string | undefined;
    // Kept when the payload must be localized per subscriber.
    let birthData: {
      babyName: string;
      weight: number;
      lengthCm: number;
      birthMessage: string;
      birthMessageEn: string;
    } | null = null;

    if (type === 'generic') {
      title = String(data.title ?? '').trim();
      bodyText = String(data.body ?? '').trim();
      if (!title || !bodyText) {
        return NextResponse.json({ error: 'Titolo e testo sono obbligatori' }, { status: 400 });
      }
    } else if (type === 'birth') {
      const babyName = String(data.babyName ?? '').trim();
      const birthMessage = String(data.birthMessage ?? '').trim();
      const birthMessageEn = String(data.birthMessageEn ?? '').trim();
      const weightRaw = parseNumber(data.weight);
      const lengthRaw = parseNumber(data.lengthCm);
      const birthDatetime = data.birthDatetime ? new Date(data.birthDatetime) : null;
      const notify = data.notify === undefined ? true : Boolean(data.notify);

      if (
        Number.isNaN(weightRaw) ||
        Number.isNaN(lengthRaw) ||
        !birthDatetime ||
        Number.isNaN(birthDatetime.getTime())
      ) {
        return NextResponse.json(
          { error: 'Peso, lunghezza e data/ora sono obbligatori per le notifiche di nascita' },
          { status: 400 }
        );
      }

      const weight = Math.round(weightRaw * 1000) / 1000;
      const lengthCm = Math.round(lengthRaw);

      const client = await getMongoClient();
      const db = client.db('pushnotify');
      // Single birth document, replaced atomically so a failure cannot leave
      // the collection empty.
      await db.collection('births').replaceOne(
        { _id: 'birth' as any },
        { babyName, weight, lengthCm, birthMessage, birthMessageEn, birthDatetime, updatedAt: new Date() },
        { upsert: true }
      );

      birthData = { babyName, weight, lengthCm, birthMessage, birthMessageEn };

      // No cache to invalidate: the home page is rendered on every request and
      // reads this document directly.
      if (!notify) {
        return NextResponse.json({
          success: true,
          saved: true,
          sent: 0,
          message: 'Registrazione aggiornata (no notifica inviata)',
        });
      }
    } else {
      return NextResponse.json({ error: 'Tipo di notifica non supportato' }, { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');

    const subscriptions = await col.find({}).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, total: 0, message: 'Nessun iscritto trovato' });
    }

    // The payload only depends on the locale, so build and serialize it once
    // per distinct locale instead of once per subscriber: both Intl formatting
    // and JSON.stringify are wasted work when repeated for every device.
    const common = { icon: '/icon-192.png', badge: '/icon-72.png', url };
    let payloadFor: (locale: unknown) => string;

    if (birthData) {
      const birth = birthData;
      const cache = new Map<string, string>();
      payloadFor = (locale) => {
        const key = typeof locale === 'string' ? locale : 'it-IT';
        let payload = cache.get(key);
        if (!payload) {
          payload = JSON.stringify({ ...formatBirthNotification(birth, key), ...common });
          cache.set(key, payload);
        }
        return payload;
      };
    } else {
      const payload = JSON.stringify({ title, body: bodyText, ...common });
      payloadFor = () => payload;
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (doc) => {
        try {
          await webpush.sendNotification(doc.subscription, payloadFor(doc.locale));
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await col.deleteOne({ _id: doc._id });
          }
          console.error('[send-notification] Delivery failed', {
            endpoint: doc.subscription?.endpoint,
            statusCode: err?.statusCode,
            message: err?.message,
          });
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;

    return NextResponse.json({
      success: true,
      sent,
      failed: results.length - sent,
      total: subscriptions.length,
    });
  } catch (err) {
    console.error('[send-notification] Error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const denied = guard(req);
  if (denied) {
    return denied;
  }

  try {
    const client = await getMongoClient();
    const db = client.db('pushnotify');
    const count = await db.collection('subscriptions').countDocuments();
    const hasBirth = (await db.collection('births').countDocuments()) > 0;
    return NextResponse.json({ count, hasBirth });
  } catch (err) {
    console.error('[send-notification] GET error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
