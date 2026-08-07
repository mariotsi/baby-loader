import HomeClient from '@/components/HomeClient';
import { getBirth } from '@/lib/birth';
import { FUSION_SEEN_KEY } from '@/lib/fusion';

// Safety net: the page is refreshed on demand by revalidatePath('/') as soon as
// the birth is registered, but if that ever fails on the hosting runtime the
// announcement still goes live within a minute.
export const revalidate = 60;

/**
 * localStorage can only be read after mount, so with React state alone a
 * first-time visitor would glimpse the birth details before the video covers
 * them, spoiling the reveal. This runs before the first paint and lets CSS
 * decide immediately. Rendered only once the birth exists.
 *
 * The timeout is the escape hatch: if hydration never happens, the overlay
 * must not keep the page hostage.
 */
const FUSION_BOOT_SCRIPT = `(function(){try{var r=document.documentElement;
r.dataset.fusione=localStorage.getItem(${JSON.stringify(FUSION_SEEN_KEY)})==='1'?'seen':'pending';
setTimeout(function(){if(r.dataset.fusione==='pending'){r.dataset.fusione='seen';}},10000);
}catch(e){}})();`;

export default async function HomePage() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';

  if (!vapidKey) {
    // NEXT_PUBLIC_* values are inlined at build time: adding one to .env.local
    // requires restarting the dev server.
    console.warn(
      '[home] NEXT_PUBLIC_VAPID_PUBLIC_KEY non impostata: le iscrizioni push falliranno. ' +
        'Genera le chiavi con `npm run generate-vapid`, aggiungile a .env.local e riavvia il server.'
    );
  }

  const birth = await getBirth();

  return (
    <>
      {birth && <script dangerouslySetInnerHTML={{ __html: FUSION_BOOT_SCRIPT }} />}
      <HomeClient vapidPublicKey={vapidKey} birth={birth} />
    </>
  );
}
