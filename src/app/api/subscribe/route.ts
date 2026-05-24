import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function POST(req: NextRequest) {
  try {
    const { subscription } = await req.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Subscription non valida' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');

    // Upsert by endpoint to avoid duplicates
    await col.updateOne(
      { 'subscription.endpoint': subscription.endpoint },
      {
        $set: {
          subscription,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
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
  try {
    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint mancante' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db('pushnotify');
    const col = db.collection('subscriptions');

    await col.deleteOne({ 'subscription.endpoint': endpoint });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[unsubscribe] Error:', err);
    return NextResponse.json({ error: 'Errore interno del server' }, { status: 500 });
  }
}
