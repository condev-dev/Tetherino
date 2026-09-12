/* تتریــنو — service worker */
const CACHE = 'nabz-toman-shell-v1';

const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './pwa.js',
  './manifest.webmanifest',
  './app-icon.svg',
  './favicon.svg',
  './favicon.ico',
  './favicon-16x16.png',
  './favicon-32x32.png',
  './android-chrome-192x192.png',
  './android-chrome-512x512.png',
  './maskable-icon-192x192.png',
  './maskable-icon-512x512.png',
  './apple-touch-icon.png',
  './vendor/gsap.min.js',
  './assets/fonts/Vazirmatn-Regular.woff2',
  './assets/fonts/Vazirmatn-Medium.woff2',
  './assets/fonts/Vazirmatn-Bold.woff2',
  './assets/fonts/Lalezar-Regular.woff2',
  './assets/fonts/Lalezar-Latin.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('nabz-toman-shell-') && k !== CACHE)
          .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;

  // درخواستهای داده زنده هرگز از کش پاسخ داده نمیشوند
  if (!sameOrigin) return;

  // ناوبری داخل scope: شبکه اول، سپس پوسته کش شده
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(() => caches.match('./index.html', { ignoreSearch: true }))
    );
    return;
  }

  // دارایی همان مبدا: کش اول
  event.respondWith(
    caches.match(req, { ignoreSearch: false }).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      });
    })
  );
});
