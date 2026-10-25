// Офлайн: кэшируем оболочку приложения. Поднимай VERSION при каждом изменении файлов.
const VERSION = 'alder-v5';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/fonts.css',
  './css/style.css',
  './icons/icon.svg',
  './js/app.js',
  './js/art.js',
  './js/db.js',
  './js/geo.js',
  './js/identify.js',
  './js/lore.js',
  './js/data/index.js',
  './js/data/ru.js',
  './js/data/ru-regional.js',
  './js/data/ae.js',
  './fonts/cormorant-garamond-cyrillic-500-italic.woff2',
  './fonts/cormorant-garamond-cyrillic-600-normal.woff2',
  './fonts/cormorant-garamond-latin-500-italic.woff2',
  './fonts/cormorant-garamond-latin-600-normal.woff2',
  './fonts/golos-text-cyrillic-400-normal.woff2',
  './fonts/golos-text-cyrillic-500-normal.woff2',
  './fonts/golos-text-cyrillic-600-normal.woff2',
  './fonts/golos-text-latin-400-normal.woff2',
  './fonts/golos-text-latin-500-normal.woff2',
  './fonts/golos-text-latin-600-normal.woff2',
  './fonts/ibm-plex-mono-cyrillic-400-normal.woff2',
  './fonts/ibm-plex-mono-cyrillic-500-normal.woff2',
  './fonts/ibm-plex-mono-latin-400-normal.woff2',
  './fonts/ibm-plex-mono-latin-500-normal.woff2',
  './fonts/literata-cyrillic-400-italic.woff2',
  './fonts/literata-cyrillic-400-normal.woff2',
  './fonts/literata-cyrillic-600-normal.woff2',
  './fonts/literata-latin-400-italic.woff2',
  './fonts/literata-latin-400-normal.woff2',
  './fonts/literata-latin-600-normal.woff2',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // API идёт напрямую
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).catch(() => caches.match('./index.html')))
  );
});
