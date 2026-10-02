/*
 * Service-worker kill switch (2026-10-02).
 *
 * The Workbox precache SW shipped by earlier builds kept serving stale
 * app shells after every deploy: the shell references content-hashed
 * assets that no longer exist, so the page renders blank until the SW
 * happens to update. Browsers only recover when they re-fetch this
 * script (served with no-cache), so replace it with a worker that
 * unregisters itself and clears every cache, then reloads its clients.
 * Offline precaching is gone by design — the app needs the API anyway.
 */
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const client of clients) {
        client.navigate(client.url);
      }
    })()
  );
});
