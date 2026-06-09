import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import clientPromise from '@/lib/mongodb';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function POST(req: NextRequest) {
  // Simple password protection
  const authHeader = req.headers.get('x-admin-password');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const { type = 'generic', url } = data as any;

    // For generic notifications expect title/body
    let title: string | undefined = undefined;
    let bodyText: string | undefined = undefined;
    // If this is a birth notification, keep data to allow per-subscriber localization
    let birthData: { babyName?: string; weight?: number; lengthCm?: number; birthMessage?: string } | null = null;

    if (type === 'generic') {
      title = (data.title || '').toString();
      bodyText = (data.body || '').toString();
      if (!title || !bodyText) {
        return NextResponse.json({ error: 'Titolo e testo sono obbligatori' }, { status: 400 });
      }
    } else if (type === 'birth') {
      const babyName = (data.babyName || '').toString();
      const weight = Number(data.weight);
      const reqLocale = (data.locale && typeof data.locale === 'string') ? data.locale : 'it-IT';
      const weightText = typeof weight === 'number' && !Number.isNaN(weight)
        ? new Intl.NumberFormat(reqLocale, { maximumFractionDigits: 3 }).format(weight)
        : (data.weight || '').toString();
      const lengthCm = Number(data.lengthCm);
      const birthMessage = (data.birthMessage || '').toString();
      const birthDatetime = data.birthDatetime ? new Date(data.birthDatetime) : null;
      const notify = data.notify === undefined ? true : Boolean(data.notify);

      if (Number.isNaN(weight) || Number.isNaN(lengthCm) || !birthDatetime) {
        return NextResponse.json({ error: 'Peso, lunghezza e data/ora sono obbligatori per le notifiche di nascita' }, { status: 400 });
      }

      // Save birth record
      const client = await clientPromise;
      const db = client.db('pushnotify');
      const births = db.collection('births');
      // Ensure at most one birth document exists: clear and insert the new one
      await births.deleteMany({});
      await births.insertOne({ babyName, weight, lengthCm, birthMessage, birthDatetime, createdAt: new Date() });

      // Prepare notification text (format weight with comma as decimal separator)
      title = babyName ? `È nata ${babyName}!` : `È nata!`;
      bodyText = `Pesa ${weightText} kg ed è lunga ${lengthCm} cm.`;
      if (birthMessage) bodyText += ` ${birthMessage}`;
      birthData = { babyName, weight, lengthCm, birthMessage };
      // if notify === false we will skip sending notifications
      if (!notify) {
        return NextResponse.json({ success: true, saved: true, sent: 0, message: 'Registrazione aggiornata (no notifica inviata)' });
      }
    } else {
      return NextResponse.json({ error: 'Tipo di notifica non supportato' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');

    const subscriptions = await col.find({}).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Nessun iscritto trovato' });
    }

    const results = await Promise.allSettled(
      subscriptions.map(async (doc) => {
        try {
          // If this was a birth notification, format numbers using the subscriber's locale when available
          let payloadObj: any;
          if (birthData) {
            const locale = (doc.locale && typeof doc.locale === 'string') ? doc.locale : 'it-IT';
            const isEn = /^en/i.test(locale);
            const weightTextLocal = typeof birthData.weight === 'number' && !Number.isNaN(birthData.weight)
              ? new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(birthData.weight)
              : (birthData.weight || '').toString();
            const titleLocal = isEn
              ? (birthData.babyName ? `It's a girl, ${birthData.babyName}!` : `It's a girl!`)
              : (birthData.babyName ? `È nata ${birthData.babyName}!` : `È nata!`);
            let bodyLocal = isEn
              ? `Weighs ${weightTextLocal} kg and is ${birthData.lengthCm} cm long.`
              : `Pesa ${weightTextLocal} kg ed è lunga ${birthData.lengthCm} cm.`;
            // Append birthMessage: if recipient is English, prefix the Italian flag emoji before the admin message
            if (birthData.birthMessage) {
              bodyLocal += isEn ? ` 🇮🇹 ${birthData.birthMessage}` : ` ${birthData.birthMessage}`;
            }
            payloadObj = { title: titleLocal, body: bodyLocal, icon: '/icon-192.png', badge: '/icon-72.png', url: url || '/' };
          } else {
            payloadObj = { title, body: bodyText, icon: '/icon-192.png', badge: '/icon-72.png', url: url || '/' };
          }

          const payload = JSON.stringify(payloadObj);
          await webpush.sendNotification(doc.subscription, payload);
          return { endpoint: doc.subscription.endpoint, status: 'sent' };
        } catch (err: any) {
          // Remove expired/invalid subscriptions (410 Gone)
          if (err.statusCode === 410 || err.statusCode === 404) {
            await col.deleteOne({ _id: doc._id });
          }
          throw err;
        }
      })
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    return NextResponse.json({ success: true, sent, failed, total: subscriptions.length });
  } catch (err) {
    console.error('[send-notification] Error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-admin-password');
  if (authHeader !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }

  try {
    const client = await clientPromise;
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');
    const count = await col.countDocuments();
    const births = db.collection('births');
    const hasBirth = (await births.countDocuments()) > 0;
    return NextResponse.json({ count, hasBirth });
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
