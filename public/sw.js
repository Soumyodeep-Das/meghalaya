const CACHE_NAME = 'meghalaya-v2';
const URLS_TO_CACHE = [
    '/',
    '/dashboard',
    '/add',
    '/analytics',
    '/offline.html',
    '/manifest.json',
    '/faaah.mp3'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

self.addEventListener('fetch', (event) => {
    // Ignote Appwrite API or external calls for cache-first, treat them as network-only or network-first
    // For Next.js app shell, we try cache then network

    const url = new URL(event.request.url);

    if (url.pathname.startsWith('/_next') || url.origin !== location.origin) {
        // Network First for API and Next assets (simplified)
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            })
    );
});

self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
