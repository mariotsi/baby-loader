import type { Metadata } from 'next';
import { Suspense } from 'react';
import SubscriptionsClient from '@/components/SubscriptionsClient';

export const metadata: Metadata = {
  title: 'Iscrizioni · Area riservata',
  robots: { index: false, follow: false },
};

export default function SubscriptionsPage() {
  return (
    <Suspense fallback={null}>
      <SubscriptionsClient />
    </Suspense>
  );
}
