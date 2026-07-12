self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // Mantém o app funcionando online normalmente
    event.respondWith(fetch(event.request));
});