// GaiaCom is a trademark of VisionGaiaTechnology. Copyright (C) 2026 VisionGaiaTechnology. Licensed under AGPL-3.0-or-later. Trademark rights are reserved.
// GaiaCOM PWA Service Worker (Security-Hardened: Zero Cache Storage)

self.addEventListener('install', event => {
  // Activate immediately without caching anything
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Claim clients immediately and clear any legacy caches to ensure zero persistent local files
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys.map(key => caches.delete(key)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Pure pass-through fetch: NO CACHING (zero local file storage) for maximum security
  event.respondWith(fetch(event.request));
});
