// PushCast Service Worker v1.0
// Handles push events and notification clicks

self.addEventListener('install', (event) => {
  console.log('[SW] Installed');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activated');
  event.waitUntil(clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {
    title: 'PushCast',
    body: 'Hai ricevuto una notifica.',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    url: '/',
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch {
      data.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      vibrate: [100, 50, 100],
      tag: 'pushcast-' + Date.now(),
      requireInteraction: false,
      data: { url: data.url },
      actions: [
        { action: 'open', title: 'Apri' },
        { action: 'dismiss', title: 'Chiudi' },
      ],
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Subscription changed');
  // The client will handle re-subscription on next visit
});
