// Retire the previous PWA worker for returning users. New clients do not register it.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith('workbox-') || name === 'start-url').map(name => caches.delete(name)));
    await self.registration.unregister();
  })());
});