import type { Metadata } from 'next';
import InviaClient from '@/components/InviaClient';

export const metadata: Metadata = {
  title: 'Area riservata',
  robots: { index: false, follow: false },
};

export default function InviaPage() {
  return <InviaClient />;
}
