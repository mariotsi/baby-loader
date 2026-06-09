import type { Metadata } from 'next';
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
};

export const viewport = {
   themeColor: '#0a0a0a',
 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className={`${dmSerif.variable} ${dmMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.png" type="image/svg+xml" />
      </head>
      <body>{children}</body>
    </html>
  );
}
