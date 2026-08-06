import HomeClient from '@/components/HomeClient';

export default function HomePage() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

  if (!vapidKey) {
    // NEXT_PUBLIC_* values are inlined at build time: adding one to .env.local
    // requires restarting the dev server.
    console.warn(
      '[home] NEXT_PUBLIC_VAPID_PUBLIC_KEY non impostata: le iscrizioni push falliranno. ' +
        'Genera le chiavi con `npm run generate-vapid`, aggiungile a .env.local e riavvia il server.'
    );
  }

  return <HomeClient vapidPublicKey={vapidKey} />;
}
