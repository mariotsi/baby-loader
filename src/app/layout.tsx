import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { LANG_COOKIE, negotiateLang } from '@/lib/i18n';
import { DM_Serif_Display, DM_Mono } from 'next/font/google';
import './globals.css';

const dmSerif = DM_Serif_Display({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
});

const dmMono = DM_Mono({
  weight: ['300', '400', '500'],
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Stefania & Simone',
  description: 'Notifiche push per tutti i tuoi dispositivi',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icon-192.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png' },
    ],
    apple: '/icon-192.png',
  },
};

export const viewport = {
  // Matches manifest.json theme_color.
  themeColor: '#FFF1F8',
};

// The language is read from the request, so this document cannot be a static
// artifact shared by every visitor.
export const dynamic = 'force-dynamic';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);
  const lang = negotiateLang(headerList.get('accept-language'), cookieStore.get(LANG_COOKIE)?.value);

  return (
    <html lang={lang} className={`${dmSerif.variable} ${dmMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
