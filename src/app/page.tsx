import HomeClient from '@/components/HomeClient';

export default function HomePage() {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  return <HomeClient vapidPublicKey={vapidKey} />;
}
