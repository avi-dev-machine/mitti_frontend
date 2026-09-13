/* ── MITTI — Service worker ──
 *
 * Offline support for a field app on a rural connection.
 *
 * Caching rules, and the reasoning behind each:
 *
 *   Navigations      network first, then cache, then the offline page. Fresh
 *                    when possible; never a dead tab when not.
 *   Static assets    cache first. Hashed build output never changes under a
 *                    given URL, so a revalidation would always be wasted.
 *   API responses    NOT cached here. Sensor readings and advisories are
 *                    user-specific, and a shared Cache Storage entry would
 *                    outlive sign-out and could be served to the next account
 *                    on a shared phone. TanStack Query holds them in memory
 *                    for the session instead, where sign-out clears them.
 *   Auth endpoints   never touched. Tokens must not sit in a cache.
 */

const VERSION = 'mitti-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const OFFLINE_URL = '/offline';

/* Precache only what the offline page itself needs. Route chunks are added as
   the user visits them, so the first install stays small on a slow link. */
const SHELL_ASSETS = [OFFLINE_URL, '/manifest.json', '/icons/icon-192.jpg', '/icons/icon-512.jpg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      // addAll is all-or-nothing; a single 404 would abort the install, so
      // each asset is added independently.
      .then((cache) => Promise.allSettled(SHELL_ASSETS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

/** Requests that must always go straight to the network. */
function isBypassed(url, request) {
  return (
    // Anything auth-related: tokens must never enter a cache.
    url.pathname.startsWith('/auth/') ||
    url.pathname.startsWith('/api/') ||
    url.hostname.endsWith('.supabase.co') ||
    // Server Actions and RSC payloads are per-request.
    request.headers.has('Next-Router-Prefetch') ||
    url.searchParams.has('_rsc')
  );
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:css|js|woff2?|png|jpe?g|svg|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is ever cacheable; a cached POST would replay a write.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isBypassed(url, request)) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(SHELL_CACHE);
          cache.put(request, response.clone());
          return response;
        } catch {
          const cached = await caches.match(request);
          if (cached) return cached;
          const offline = await caches.match(OFFLINE_URL);
          return (
            offline ??
            new Response('You are offline.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          );
        }
      })(),
    );
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(ASSET_CACHE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          // A missing asset offline degrades the page; it must not throw.
          return new Response('', { status: 504 });
        }
      })(),
    );
  }
});

/* Let the page ask a waiting worker to take over immediately. */
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
