const CACHE_NAME = 'cultural-id-v1';
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

// نصب Service Worker و کش کردن دارایی‌ها
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// فعال‌سازی و پاک کردن کش‌های قدیمی
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          return caches.delete(key);
        }
      }));
    })
  );
});

// دریافت درخواست‌ها و ارائه از کش در صورت عدم دسترسی به شبکه
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
