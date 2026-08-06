// Stefania & Simone Service Worker v1.0
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
    title: 'Stefania & Simone',
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
      // Stable tag so a re-sent announcement replaces the previous one instead
      // of stacking; renotify still alerts the user.
      tag: data.tag || 'stefania-simone',
      renotify: true,
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

  if (event.action === 'dismiss') {
    return;
  }

  // Resolve against the origin: notification data holds a relative path while
  // client.url is absolute, so a raw comparison would never match.
  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Fall back to focusing any open window and navigating it.
        const [first] = windowClients;
        if (first && 'navigate' in first && 'focus' in first) {
          return first.navigate(urlToOpen).then((c) => (c || first).focus());
        }
        return clients.openWindow(urlToOpen);
      })
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('[SW] Subscription changed');
  // The client will handle re-subscription on next visit
});
