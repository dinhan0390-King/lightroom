const CACHE_NAME = 'be-picture-v8';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Kích hoạt ngay lập tức bản mới
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key); // Xóa sạch các bản cache cũ
          }
        })
      );
    }).then(() => self.clients.claim()) // Chiếm quyền điều khiển ngay lập tức
  );
});

self.addEventListener('fetch', (event) => {
  // Ưu tiên lấy từ mạng nếu có mạng để luôn nhận bản mới nhất
  event.respondWith(
    fetch(event.request).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const responseClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
      }
      return networkResponse;
    }).catch(() => {
      // Khi mất mạng thì mới dùng bản cache offline
      return caches.match(event.request).then(cached => cached || caches.match('./index.html'));
    })
  );
});
