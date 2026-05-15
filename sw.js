const CACHE_NAME = 'fintrack-v1';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './manifest.json',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // Only cache GET requests to avoid breaking Firebase calls
  if (e.request.method !== 'GET') return;
  
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});
