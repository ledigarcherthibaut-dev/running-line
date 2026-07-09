const CACHE_VERSION = 'v1';
const SHELL_CACHE   = 'shell-' + CACHE_VERSION;
const ROUTE_CACHE   = 'routes-' + CACHE_VERSION;

const SHELL_ASSETS = [
  '/',
  '/manifest.json',
  '/assets/fonts/Anton-Regular.ttf',
  '/assets/fonts/Roboto-VariableFont_wdthwght.ttf',
  '/assets/fonts/RobotoMono-VariableFont_wght.ttf'
];

/* ── INSTALL: précache app shell ── */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then(c => c.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/* ── ACTIVATE: supprimer les vieux caches ── */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys
        .filter(k => k !== SHELL_CACHE && k !== ROUTE_CACHE)
        .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

/* ── FETCH: stratégie par domaine ── */
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  /* Appels réseau : BRouter, Supabase, tuiles → network-first, pas de cache */
  const isNetworkOnly =
    url.hostname.includes('brouter') ||
    url.hostname.includes('supabase') ||
    url.hostname.includes('arcgisonline') ||
    url.hostname.includes('tile.openstreetmap') ||
    url.hostname.includes('unpkg.com') ||
    url.hostname.includes('jsdelivr');

  if (isNetworkOnly) {
    e.respondWith(fetch(e.request));
    return;
  }

  /* App shell → cache-first */
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') return response;
        const clone = response.clone();
        caches.open(SHELL_CACHE).then(c => c.put(e.request, clone));
        return response;
      });
    })
  );
});
