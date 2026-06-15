const CACHE_SHELL = 'washboard-shell-v1';
const CACHE_DATA  = 'washboard-data-v1';
const SUPABASE_HOST = 'dpgfuzowfliyxdkmwgbc.supabase.co';

const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
];

// ── Install: precache shell assets ──────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_SHELL).then(cache =>
      cache.addAll(SHELL_ASSETS)
    ).then(() => self.skipWaiting())
  );
});

// ── Activate: claim clients and purge stale caches ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_SHELL && k !== CACHE_DATA)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: route by request type ────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle http/https
  if (!url.protocol.startsWith('http')) return;

  // Supabase API calls
  if (url.hostname === SUPABASE_HOST) {
    if (request.method === 'GET') {
      // Stale-while-revalidate: serve cache instantly, update in background
      event.respondWith(staleWhileRevalidate(request, CACHE_DATA));
    }
    // Non-GET (writes) — network only, let the app handle failures
    return;
  }

  // Navigation requests — cache-first, fall back to '/' for offline SPA
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('/').then(cached => cached || fetch(request))
    );
    return;
  }

  // Shell assets (CDN scripts, icons, fonts) — stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request, CACHE_SHELL));
});

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(cache =>
    cache.match(request).then(cached => {
      const fetchPromise = fetch(request).then(response => {
        if (response && response.status === 200) {
          cache.put(request, response.clone());
        }
        return response;
      }).catch(() => null);
      return cached || fetchPromise;
    })
  );
}
