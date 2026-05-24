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
    const { title, body, url } = await req.json();

    if (!title || !body) {
      return NextResponse.json({ error: 'Titolo e testo sono obbligatori' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');

    const subscriptions = await col.find({}).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: 'Nessun iscritto trovato' });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/icon-192.svg',
      badge: '/icon-72.svg',
      url: url || '/',
    });

    const results = await Promise.allSettled(
      subscriptions.map(async (doc) => {
        try {
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
    return NextResponse.json({ count });
  } catch (err) {
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
