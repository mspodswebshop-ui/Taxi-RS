// Ontvangt de pushmelding en toont ze, ook als het beheerscherm dicht is.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let data = {};
  try { data = e.data.json(); } catch { /* lege of onleesbare melding */ }
  e.waitUntil(self.registration.showNotification(data.titel || 'Weblity', {
    body: data.bericht || 'Er is iets nieuws in je boekingen.',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
  }));
});

// Een tik op de melding opent het beheerscherm (of haalt het naar voren).
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(vensters => {
    const open = vensters.find(v => 'focus' in v);
    return open ? open.focus() : self.clients.openWindow('/');
  }));
});
