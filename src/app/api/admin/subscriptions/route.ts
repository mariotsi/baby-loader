import { NextRequest, NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { adminGuard } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) {
    return NextResponse.json({ error: denied.error }, { status: denied.status });
  }

  try {
    const client = await getMongoClient();
    const db = client.db('pushnotify');

    // Never return subscription.endpoint/keys: they're the push credentials,
    // not identifying info about the person/device.
    const docs = await db
      .collection('subscriptions')
      .find({}, { projection: { 'subscription.endpoint': 0, 'subscription.keys': 0 } })
      .sort({ createdAt: -1 })
      .toArray();

    const subscriptions = docs.map((doc) => ({
      id: doc._id.toString(),
      locale: doc.locale ?? null,
      ip: doc.ip ?? null,
      device: doc.device ?? null,
      location: doc.location ?? null,
      createdAt: doc.createdAt ?? null,
      updatedAt: doc.updatedAt ?? null,
      // True for the device recorded as the admin's own via
      // ADMIN_SUBSCRIPTION_ID, so the UI can label it instead of pinging
      // itself in the list.
      isAdmin: process.env.ADMIN_SUBSCRIPTION_ID === doc._id.toString(),
    }));

    return NextResponse.json({ subscriptions });
  } catch (err) {
    console.error('[admin/subscriptions] Error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
