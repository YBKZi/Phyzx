// Gestione delle notifiche push (caricato dal service worker principale)
self.addEventListener('push', event => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { /* payload non valido */ }
  event.waitUntil(self.registration.showNotification(d.title || 'Phyzx', {
    body: d.body || 'Dati aggiornati',
    icon: self.registration.scope + 'icon-192.png',
    tag: 'phyzx-update',
    renotify: true,
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(self.registration.scope);
  }));
});
