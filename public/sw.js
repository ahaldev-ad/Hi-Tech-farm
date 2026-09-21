// Service Worker for High-Priority Background Phone Push Notifications
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle high-priority background push event
self.addEventListener('push', (event) => {
  let data = { title: '🚨 CRITICAL ALERT: Paradise Mushroom', body: 'Environmental threshold breached!' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || 'Environmental threshold breached!',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    vibrate: [500, 100, 500, 100, 500, 100, 1000], // Heavy attention vibration pulse
    requireInteraction: true,                       // Forces notification to stay on screen until user interacts!
    renotify: true,                                 // Re-triggers alert sound and vibration for new alerts
    tag: 'critical-paradise-alert',
    timestamp: Date.now(),
    actions: [
      { action: 'open', title: 'Open Dashboard' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || '🚨 CRITICAL ALERT: Paradise Mushroom', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
