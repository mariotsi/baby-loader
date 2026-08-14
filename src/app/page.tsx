import { cookies, headers } from 'next/headers';
import HomeClient from '@/components/HomeClient';
import { LangProvider } from '@/components/LangProvider';
import { getBirth } from '@/lib/birth';
import { FUSION_SEEN_KEY } from '@/lib/fusion';
import { LANG_COOKIE, negotiateLang } from '@/lib/i18n';

// The page depends on the request language and reads the birth record on every
// visit, so there is nothing to cache. This is also what keeps the page honest
// when the record is edited or removed straight from the database.
export const dynamic = 'force-dynamic';

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

  const [headerList, cookieStore, birth] = await Promise.all([headers(), cookies(), getBirth()]);
  const lang = negotiateLang(headerList.get('accept-language'), cookieStore.get(LANG_COOKIE)?.value);

  return (
    <LangProvider initial={lang}>
      {birth && <script dangerouslySetInnerHTML={{ __html: FUSION_BOOT_SCRIPT }} />}
      <HomeClient vapidPublicKey={vapidKey} birth={birth} />
    </LangProvider>
  );
}
