const CACHE_NAME = 'cultural-id-v3';

const ASSETS_TO_CACHE = [
  '
/assets/logo-fa.png',
  '/assets/logo-en.png',
  '/assets/hologram.png',
  '/assets/pisa.jpg'
];

// نصب Service Worker جدید
self.addEventListener('install', (event) => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// فعال‌سازی Service Worker جدید
// و حذف تمام Cacheهای قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// درخواست‌های صفحات و فایل‌ها
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  // فایل‌های HTML هرگز از Cache خوانده نشوند.
  // همیشه آخرین نسخه از سرور دریافت شود.
  if (
    requestUrl.pathname === '/' ||
    requestUrl.pathname.endsWith('.html')
  ) {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          return caches.match(event.request);
        })
    );

    return;
  }

  // برای سایر فایل‌ها:
  // ابتدا شبکه، و در صورت قطع بودن شبکه Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.ok) {
          const responseClone = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
