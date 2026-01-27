self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Wallet notification', body: event.data.text() };
  }
  const title = payload.title || 'Wallet notification';
  const options = {
    body: payload.body || '',
    data: payload.action || {},
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const href = event.notification.data?.href;
  if (href) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        for (const client of clients) {
          if ('focus' in client) {
            client.navigate(href);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(href);
        }
        return undefined;
      })
    );
  }
});
