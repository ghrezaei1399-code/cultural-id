```javascript
const CACHE_NAME = 'cultural-id-v2';

const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index-en.html',
  '/card-fa.html',
  '/card-en.html',
  '/about-fa.html',
  '/about-en.html',
  '/assets/logo-fa.png',
  '/assets/logo-en.png',
  '/assets/hologram.png',
  '/assets/pisa.jpg'
];

// نصب نسخه جدید Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// فعال‌سازی نسخه جدید و حذف کش‌های قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// همیشه ابتدا نسخه جدید شبکه را امتحان کن
// و فقط در صورت قطع شبکه از Cache استفاده کن.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
```
